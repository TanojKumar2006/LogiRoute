# LogiRoute API (Fastify + Better Auth + Supabase Postgres)

## Setup
1. `cp .env.example .env` and fill in real values (Supabase pooler URL, secrets).
2. `npm install`
3. `npm run auth:migrate`   # creates Better Auth tables (user, session, account, verification, role column)
4. `npm run db:migrate`     # creates LogiRoute tables (needs `psql`)
5. `npm run dev`            # http://localhost:8080  (GET /health)

## First admin
Sign up through `POST /api/auth/sign-up/email`, then in the Supabase SQL editor run:
`update "user" set role='admin' where email='you@example.com';`
After that, admins can promote others with `PATCH /api/v1/admin/users/:userId/role`.

## Real tracking
GPS devices or a carrier webhook send positions:
`POST /api/v1/tracking/pings` with header `x-device-key: $DEVICE_API_KEY` and body
`{"vehicle":"VEH-000001","lat":14.47,"lon":78.82,"speedKmh":52}`.
`GET /api/v1/shipments/DEL-2026-000001/tracking` returns the latest position and trail; `live` is false if no ping arrived in 5 minutes.

## Deploy (Fly.io)
```
fly launch --no-deploy --copy-config
fly secrets set DATABASE_URL=... BETTER_AUTH_SECRET=... BETTER_AUTH_URL=https://YOUR-APP.fly.dev \
  ALLOWED_ORIGINS=https://YOUR-SITE.pages.dev DEVICE_API_KEY=...
fly deploy
```
Cookies: with the frontend on pages.dev and the API on fly.dev, production uses SameSite=None; Secure. A shared parent domain is more robust.
