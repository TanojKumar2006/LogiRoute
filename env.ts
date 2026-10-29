import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().default(8080),
  LOG_LEVEL: z.string().default("info"),
  DATABASE_URL: z.string().url(),
  DATABASE_SSL_CA: z.string().optional(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url(),
  ALLOWED_ORIGINS: z.string().min(1),
  DEVICE_API_KEY: z.string().min(24),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}
export const env = parsed.data;
export const origins = env.ALLOWED_ORIGINS.split(",").map((s) => s.trim());
