import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { fromNodeHeaders } from "better-auth/node";
import { randomUUID, timingSafeEqual } from "node:crypto";
import type pg from "pg";
import { z } from "zod";
import { env, origins } from "./env.js";
import { pool, tx } from "./db.js";
import { auth } from "./auth.js";

type Role = "admin" | "planner" | "operator" | "analyst" | "viewer";
declare module "fastify" {
  interface FastifyRequest {
    user?: { id: string; email: string; role: Role };
  }
}

const STATUSES = ["Pending", "Planned", "Assigned", "In Transit", "Delivered", "Failed", "Unserved", "Exception"] as const;
const NEXT: Record<string, string[]> = {
  Pending: ["Planned", "Unserved"],
  Planned: ["Assigned", "Pending"],
  Assigned: ["In Transit", "Planned"],
  "In Transit": ["Delivered", "Failed", "Exception"],
  Failed: ["Pending"],
  Exception: ["Pending", "Assigned"],
  Unserved: ["Pending"],
  Delivered: [],
};
const fail = (code: string, message: string) => ({ error: { code, message } });
const likeEscape = (s: string) => `%${s.replace(/[\\%_]/g, "\\$&")}%`;

const app = Fastify({
  logger: {
    level: env.LOG_LEVEL,
    redact: ["req.headers.authorization", "req.headers.cookie", 'req.headers["x-device-key"]'],
  },
  genReqId: () => randomUUID(),
  bodyLimit: 256 * 1024,
  trustProxy: true,
});

await app.register(helmet);
await app.register(cors, { origin: origins, credentials: true, methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"] });
await app.register(rateLimit, { max: 300, timeWindow: "1 minute" });

app.setErrorHandler((err: Error & { statusCode?: number }, req, reply) => {
  if (err instanceof z.ZodError) return reply.code(400).send({ error: { code: "validation", message: "Invalid input", details: err.flatten() } });
  if (err.statusCode && err.statusCode < 500) return reply.code(err.statusCode).send(fail("request_error", err.message));
  req.log.error({ err }, "unhandled error"); // details stay in server logs only
  return reply.code(500).send(fail("internal", "Something went wrong"));
});

// ---------- Better Auth (the only authentication implementation) ----------
app.route({
  method: ["GET", "POST"],
  url: "/api/auth/*",
  config: { rateLimit: { max: 20, timeWindow: "1 minute" } },
  handler: async (request, reply) => {
    const url = new URL(request.url, `${request.protocol}://${request.headers.host}`);
    const headers = new Headers();
    for (const [k, v] of Object.entries(request.headers)) if (v) headers.append(k, Array.isArray(v) ? v.join(",") : v);
    const body = request.method === "GET" || request.body == null ? undefined : JSON.stringify(request.body);
    const res = await auth.handler(new Request(url.toString(), { method: request.method, headers, body }));
    reply.status(res.status);
    res.headers.forEach((v, k) => { if (k.toLowerCase() !== "set-cookie") reply.header(k, v); });
    const cookies = res.headers.getSetCookie();
    if (cookies.length) reply.header("set-cookie", cookies);
    return reply.send(res.body ? await res.text() : null);
  },
});

// Authorization is enforced here, on the server, for every protected endpoint.
const guard = (...roles: Role[]) => async (req: FastifyRequest, reply: FastifyReply) => {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
  if (!session) return reply.code(401).send(fail("unauthenticated", "Sign in required"));
  const role = ((session.user as { role?: string }).role ?? "viewer") as Role;
  if (!roles.includes(role)) return reply.code(403).send(fail("forbidden", "Your role cannot do this"));
  req.user = { id: session.user.id, email: session.user.email, role };
};
const ALL: Role[] = ["admin", "planner", "operator", "analyst", "viewer"];
const STAFF: Role[] = ["admin", "planner", "operator"];
const PLAN: Role[] = ["admin", "planner"];

async function audit(c: pg.PoolClient, actor: string, action: string, entity: string, before: unknown, after: unknown) {
  await c.query("insert into audit_events(actor,action,entity,before_value,after_value) values ($1,$2,$3,$4,$5)", [
    actor, action, entity, before == null ? null : JSON.stringify(before), after == null ? null : JSON.stringify(after),
  ]);
}

// ---------- health ----------
app.get("/health", async () => ({ ok: true }));
app.get("/ready", async (_r, reply) => {
  try { await pool.query("select 1"); return { ready: true }; } catch { return reply.code(503).send({ ready: false }); }
});

// ---------- current user ----------
app.get("/api/v1/me", { preHandler: guard(...ALL) }, async (req) => req.user);

// ---------- dashboard ----------
app.get("/api/v1/dashboard", { preHandler: guard(...ALL) }, async () => {
  const { rows } = await pool.query("select status, count(*)::int n from deliveries group by status");
  const by = Object.fromEntries(rows.map((r) => [r.status, r.n as number]));
  const total = rows.reduce((a, r) => a + (r.n as number), 0);
  return { total, byStatus: by };
});

// ---------- shipments ----------
const listQ = z.object({
  q: z.string().max(80).optional(),
  status: z.enum(STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
app.get("/api/v1/shipments", { preHandler: guard(...ALL) }, async (req) => {
  const p = listQ.parse(req.query);
  const { rows } = await pool.query(
    `select d.business_id as id, d.category, d.weight_kg, d.value_inr, d.status, d.expected_at,
            r.full_name as recipient, r.address_line || ', ' || r.city || ', ' || r.state || ' ' || r.postal_code as address,
            v.business_id as vehicle, dr.full_name as driver, pt.name as carrier, count(*) over()::int as total
       from deliveries d
       join recipients r on r.id = d.recipient_id
       left join vehicles v on v.id = d.vehicle_id
       left join drivers dr on dr.id = v.driver_id
       left join delivery_partners pt on pt.id = d.partner_id
      where ($1::text is null or d.business_id ilike $1 or r.full_name ilike $1 or r.city ilike $1)
        and ($2::text is null or d.status = $2)
      order by d.created_at desc, d.id desc
      limit $3 offset $4`,
    [p.q ? likeEscape(p.q) : null, p.status ?? null, p.pageSize, (p.page - 1) * p.pageSize],
  );
  return { page: p.page, pageSize: p.pageSize, total: rows[0]?.total ?? 0, items: rows.map(({ total, ...r }) => r) };
});

const idParam = z.object({ id: z.string().regex(/^DEL-\d{4}-\d{6}$/) });
app.get("/api/v1/shipments/:id", { preHandler: guard(...ALL) }, async (req, reply) => {
  const { id } = idParam.parse(req.params);
  const { rows } = await pool.query(
    `select d.business_id as id, d.category, d.weight_kg, d.value_inr, d.status, d.expected_at, d.delivered_at, d.failure_reason,
            json_build_object('name', r.full_name, 'phone', r.phone, 'email', r.email, 'address', r.address_line,
                              'city', r.city, 'state', r.state, 'postalCode', r.postal_code,
                              'lat', r.latitude, 'lon', r.longitude) as recipient,
            case when dr.id is null then null else json_build_object('name', dr.full_name, 'phone', dr.phone, 'email', dr.email, 'address', dr.address) end as driver,
            case when pt.id is null then null else json_build_object('name', pt.name, 'contact', pt.contact_person, 'phone', pt.phone, 'email', pt.email, 'address', pt.address) end as partner,
            v.business_id as vehicle
       from deliveries d
       join recipients r on r.id = d.recipient_id
       left join vehicles v on v.id = d.vehicle_id
       left join drivers dr on dr.id = v.driver_id
       left join delivery_partners pt on pt.id = d.partner_id
      where d.business_id = $1`, [id]);
  if (!rows[0]) return reply.code(404).send(fail("not_found", "Shipment not found"));
  const ev = await pool.query(
    `select e.event_type, e.from_status, e.to_status, e.actor, e.created_at from delivery_events e
       join deliveries d on d.id = e.delivery_id where d.business_id = $1 order by e.created_at`, [id]);
  return { ...rows[0], events: ev.rows };
});

const newShipment = z.object({
  category: z.string().min(1).max(60),
  weightKg: z.number().nonnegative().max(40000),
  valueInr: z.number().nonnegative().max(1e9).optional(),
  recipientId: z.number().int().positive(),
  partnerId: z.number().int().positive().optional(),
  expectedAt: z.string().datetime().optional(),
});
app.post("/api/v1/shipments", { preHandler: guard(...PLAN) }, async (req, reply) => {
  const b = newShipment.parse(req.body);
  const out = await tx(async (c) => {
    const { rows } = await c.query(
      `insert into deliveries(category, weight_kg, value_inr, recipient_id, partner_id, expected_at)
       values ($1,$2,$3,$4,$5,$6) returning id, business_id`,
      [b.category, b.weightKg, b.valueInr ?? null, b.recipientId, b.partnerId ?? null, b.expectedAt ?? null]);
    await c.query("insert into delivery_events(delivery_id,event_type,to_status,actor) values ($1,'created','Pending',$2)", [rows[0].id, req.user!.email]);
    await audit(c, req.user!.email, "shipment.create", rows[0].business_id, null, b);
    return rows[0].business_id as string;
  });
  return reply.code(201).send({ id: out });
});

const statusBody = z.object({ status: z.enum(STATUSES), reason: z.string().max(200).optional(), vehicle: z.string().regex(/^VEH-\d{6}$/).optional() });
app.patch("/api/v1/shipments/:id/status", { preHandler: guard(...STAFF) }, async (req, reply) => {
  const { id } = idParam.parse(req.params);
  const b = statusBody.parse(req.body);
  const result = await tx(async (c) => {
    const cur = await c.query("select id, status, vehicle_id from deliveries where business_id=$1 for update", [id]);
    const d = cur.rows[0];
    if (!d) return "notfound" as const;
    if (!(NEXT[d.status] ?? []).includes(b.status)) return { invalid: `${d.status} -> ${b.status}` };
    let vehicleId = d.vehicle_id as number | null;
    if (b.vehicle) {
      const v = await c.query("select id, status from vehicles where business_id=$1", [b.vehicle]);
      if (!v.rows[0] || v.rows[0].status !== "Available") return { invalid: "Vehicle not available" };
      vehicleId = v.rows[0].id;
    }
    if (["Assigned", "In Transit"].includes(b.status) && !vehicleId) return { invalid: "A vehicle is required" };
    await c.query(
      `update deliveries set status=$2, vehicle_id=$3,
         delivered_at = case when $2='Delivered' then now() else delivered_at end,
         failure_reason = case when $2='Failed' then $4 else failure_reason end where id=$1`,
      [d.id, b.status, vehicleId, b.reason ?? null]);
    await c.query("insert into delivery_events(delivery_id,event_type,from_status,to_status,actor) values ($1,'status_change',$2,$3,$4)", [d.id, d.status, b.status, req.user!.email]);
    await audit(c, req.user!.email, "shipment.status", id, { status: d.status }, { status: b.status });
    return "ok" as const;
  });
  if (result === "notfound") return reply.code(404).send(fail("not_found", "Shipment not found"));
  if (typeof result === "object") return reply.code(409).send(fail("invalid_transition", result.invalid));
  return { id, status: b.status };
});

// ---------- tracking ----------
// Devices / carrier webhooks POST positions here with the shared x-device-key header.
const ping = z.object({
  vehicle: z.string().regex(/^VEH-\d{6}$/),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  speedKmh: z.number().min(0).max(200).optional(),
  recordedAt: z.string().datetime().optional(),
});
const keyOk = (given: unknown) => {
  const a = Buffer.from(String(given ?? "")), b = Buffer.from(env.DEVICE_API_KEY);
  return a.length === b.length && timingSafeEqual(a, b);
};
app.post("/api/v1/tracking/pings", { config: { rateLimit: { max: 600, timeWindow: "1 minute" } } }, async (req, reply) => {
  if (!keyOk(req.headers["x-device-key"])) return reply.code(401).send(fail("unauthenticated", "Invalid device key"));
  const b = ping.parse(req.body);
  const r = await pool.query(
    `insert into vehicle_positions(vehicle_id, latitude, longitude, speed_kmh, recorded_at)
     select v.id, $2, $3, $4, coalesce($5::timestamptz, now()) from vehicles v where v.business_id=$1 returning id`,
    [b.vehicle, b.lat, b.lon, b.speedKmh ?? null, b.recordedAt ?? null]);
  if (!r.rows[0]) return reply.code(404).send(fail("not_found", "Unknown vehicle"));
  return reply.code(202).send({ accepted: true });
});

app.get("/api/v1/shipments/:id/tracking", { preHandler: guard(...ALL) }, async (req, reply) => {
  const { id } = idParam.parse(req.params);
  const d = await pool.query(
    `select d.status, d.vehicle_id, r.latitude as dlat, r.longitude as dlon from deliveries d
       join recipients r on r.id=d.recipient_id where d.business_id=$1`, [id]);
  if (!d.rows[0]) return reply.code(404).send(fail("not_found", "Shipment not found"));
  if (!d.rows[0].vehicle_id) return { status: d.rows[0].status, live: false, message: "No vehicle assigned yet" };
  const t = await pool.query(
    `select latitude as lat, longitude as lon, speed_kmh as "speedKmh", recorded_at as "recordedAt", source
       from vehicle_positions where vehicle_id=$1 order by recorded_at desc limit 50`, [d.rows[0].vehicle_id]);
  const last = t.rows[0];
  const ageSec = last ? (Date.now() - new Date(last.recordedAt).getTime()) / 1000 : null;
  return {
    status: d.rows[0].status,
    live: ageSec !== null && ageSec < 300, // no ping in 5 minutes => not live
    lastPosition: last ?? null,
    ageSeconds: ageSec === null ? null : Math.round(ageSec),
    destination: { lat: Number(d.rows[0].dlat), lon: Number(d.rows[0].dlon) },
    trail: t.rows.reverse(),
  };
});

// ---------- contacts (drivers, partners, recipients) ----------
const phone = z.string().regex(/^\+?[0-9 ]{10,14}$/, "Invalid phone number");
const email = z.string().email().max(120).optional().or(z.literal("").transform(() => undefined));
const driverIn = z.object({ name: z.string().min(1).max(100), phone, email, address: z.string().min(3).max(300), licenceNo: z.string().max(40).optional() });
const partnerIn = z.object({ name: z.string().min(1).max(100), contact: z.string().max(100).optional(), phone, email, address: z.string().min(3).max(300) });
const recipientIn = z.object({
  name: z.string().min(1).max(100), phone, email, address: z.string().min(3).max(300),
  city: z.string().min(1).max(80), state: z.string().min(1).max(80), postalCode: z.string().min(3).max(12),
  lat: z.number().min(-90).max(90), lon: z.number().min(-180).max(180),
});

app.get("/api/v1/drivers", { preHandler: guard(...STAFF) }, async () =>
  (await pool.query("select business_id as id, full_name as name, phone, email, address, licence_no as \"licenceNo\", active from drivers order by id")).rows);
app.get("/api/v1/partners", { preHandler: guard(...STAFF) }, async () =>
  (await pool.query("select id, name, contact_person as contact, phone, email, address from delivery_partners order by name")).rows);
app.get("/api/v1/recipients", { preHandler: guard(...STAFF) }, async (req) => {
  const { page, pageSize } = listQ.pick({ page: true, pageSize: true }).parse(req.query);
  return (await pool.query(
    `select id, full_name as name, phone, email, address_line as address, city, state, postal_code as "postalCode"
       from recipients order by id limit $1 offset $2`, [pageSize, (page - 1) * pageSize])).rows;
});

app.post("/api/v1/drivers", { preHandler: guard(...PLAN) }, async (req, reply) => {
  const b = driverIn.parse(req.body);
  const id = await tx(async (c) => {
    const r = await c.query("insert into drivers(full_name,phone,email,address,licence_no) values ($1,$2,$3,$4,$5) returning business_id",
      [b.name, b.phone, b.email ?? null, b.address, b.licenceNo ?? null]);
    await audit(c, req.user!.email, "driver.create", r.rows[0].business_id, null, { name: b.name }); // no PII in audit
    return r.rows[0].business_id as string;
  });
  return reply.code(201).send({ id });
});
app.post("/api/v1/partners", { preHandler: guard(...PLAN) }, async (req, reply) => {
  const b = partnerIn.parse(req.body);
  const id = await tx(async (c) => {
    const r = await c.query("insert into delivery_partners(name,contact_person,phone,email,address) values ($1,$2,$3,$4,$5) returning id",
      [b.name, b.contact ?? null, b.phone, b.email ?? null, b.address]);
    await audit(c, req.user!.email, "partner.create", `partner:${r.rows[0].id}`, null, { name: b.name });
    return r.rows[0].id as number;
  });
  return reply.code(201).send({ id });
});
app.post("/api/v1/recipients", { preHandler: guard(...PLAN) }, async (req, reply) => {
  const b = recipientIn.parse(req.body);
  const id = await tx(async (c) => {
    const r = await c.query(
      `insert into recipients(full_name,phone,email,address_line,city,state,postal_code,latitude,longitude)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9) returning id`,
      [b.name, b.phone, b.email ?? null, b.address, b.city, b.state, b.postalCode, b.lat, b.lon]);
    await audit(c, req.user!.email, "recipient.create", `recipient:${r.rows[0].id}`, null, { city: b.city });
    return r.rows[0].id as number;
  });
  return reply.code(201).send({ id });
});

// ---------- vehicles ----------
app.get("/api/v1/vehicles", { preHandler: guard(...STAFF) }, async () =>
  (await pool.query(
    `select v.business_id as id, v.vehicle_type as type, v.capacity_kg as "capacityKg", v.volume_m3 as "volumeM3", v.status, d.full_name as driver
       from vehicles v left join drivers d on d.id=v.driver_id order by v.id`)).rows);

// ---------- audit + admin ----------
app.get("/api/v1/audit", { preHandler: guard("admin", "analyst") }, async (req) => {
  const { page, pageSize } = listQ.pick({ page: true, pageSize: true }).parse(req.query);
  return (await pool.query("select actor, action, entity, created_at from audit_events order by id desc limit $1 offset $2", [pageSize, (page - 1) * pageSize])).rows;
});

const roleBody = z.object({ role: z.enum(["admin", "planner", "operator", "analyst", "viewer"]) });
app.patch("/api/v1/admin/users/:userId/role", { preHandler: guard("admin") }, async (req, reply) => {
  const { userId } = z.object({ userId: z.string().min(1).max(64) }).parse(req.params);
  const { role } = roleBody.parse(req.body);
  const ok = await tx(async (c) => {
    const r = await c.query('update "user" set role=$2 where id=$1 returning role', [userId, role]);
    if (!r.rows[0]) return false;
    await audit(c, req.user!.email, "user.role", `user:${userId}`, null, { role });
    return true;
  });
  return ok ? { userId, role } : reply.code(404).send(fail("not_found", "User not found"));
});

// ---------- start / graceful shutdown ----------
const stop = async () => { await app.close(); await pool.end(); process.exit(0); };
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
await app.listen({ port: env.PORT, host: "0.0.0.0" });
