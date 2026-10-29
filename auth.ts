import { betterAuth } from "better-auth";
import { env, origins } from "./env.js";
import { pool } from "./db.js";

const prod = env.NODE_ENV === "production";

// Better Auth owns the user/session/account/verification tables.
// Create them with: npm run auth:migrate  (run BEFORE migrations/001_core.sql)
export const auth = betterAuth({
  database: pool,
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  trustedOrigins: origins,
  emailAndPassword: { enabled: true, minPasswordLength: 10, maxPasswordLength: 128 },
  session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
  user: {
    additionalFields: {
      // input:false -> users cannot choose their own role at sign-up. New users are viewers.
      role: { type: "string", required: false, defaultValue: "viewer", input: false },
    },
  },
  advanced: {
    useSecureCookies: prod,
    // Frontend (Cloudflare Pages) and API (Fly.io) are on different sites in production.
    // Prefer one parent domain (app.example.com + api.example.com) with crossSubDomainCookies.
    defaultCookieAttributes: prod ? { sameSite: "none", secure: true, httpOnly: true } : { httpOnly: true },
  },
});
