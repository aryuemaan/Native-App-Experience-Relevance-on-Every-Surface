# Runbook

## Run everything (Docker)

```bash
docker compose up --build
# gateway  → http://localhost:8080
# surfaces → http://localhost:5173
```

Demo on a **real phone**: put the phone on the same Wi-Fi and rebuild the web app
pointing at your machine's LAN IP:

```bash
# macOS: ipconfig getifaddr en0   → e.g. 192.168.1.20
docker compose build \
  --build-arg VITE_GATEWAY_URL=http://192.168.1.20:8080 surface-demo
docker compose up
# on the phone browser: http://192.168.1.20:5173
```

## Run locally (no Docker)

```bash
make install          # installs both packages
make gateway          # terminal 1 → gateway on :8080
make web              # terminal 2 → Vite dev server on :5173
```

For a phone on your LAN, create `apps/surface-demo/.env` with
`VITE_GATEWAY_URL=http://<LAN-ip>:8080` before `make web`.

## Verify

```bash
make test             # 28 Care Gate / Router / tone / pipeline / graph tests
make typecheck        # gateway + web type-check
curl localhost:8080/health

# Care Gate in one line — boost suppressed for a limit-reached user:
curl -s -X POST localhost:8080/api/demo/tomas/boost      # {"delivered":false,...}
curl -s localhost:8080/api/users/tomas/audit             # RG_DEPOSIT_LIMIT_REACHED

# Dark-pattern linter rejects pushy copy:
curl -s -X POST localhost:8080/api/demo/marek/pushy-promo # {"delivered":false}

# One-tap cash-out (no app launch):
curl -s -X POST localhost:8080/api/users/marek/cashout -d '{}' -H 'content-type: application/json'
```

## Key endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | Liveness |
| GET | `/api/users` | List demo users |
| GET | `/api/users/:id/graph` | Interest & Activity Graph |
| GET | `/api/users/:id/slip` | Spoken slip status (voice / Siri) |
| PUT | `/api/users/:id/consent` | Granular per-surface consent (GDPR / TCF) |
| PUT | `/api/users/:id/rg` | Responsible-gaming status |
| PUT | `/api/users/:id/account` | KYC / age / market eligibility |
| POST | `/api/users/:id/cashout` | One-tap cash-out (settles at live value) |
| POST | `/api/users/:id/repeat-bet` | Repeat bet — 403 if RG-blocked |
| POST | `/api/users/:id/context/location` | Derived geolocation flag → quick action |
| GET | `/api/users/:id/audit` | Decision provenance |
| POST | `/api/demo/:id/scenario` | Run the scripted live match |
| POST | `/api/demo/:id/boost` | Fire one "Boosted for You" (shows gating) |
| POST | `/api/demo/:id/pushy-promo` | Fire pushy copy (shows the tone linter) |
| WS | `/stream?userId=:id` | Followed-only moment stream |

## Configuration (gateway env)

| Var | Default | Meaning |
| --- | --- | --- |
| `PORT` | 8080 | Listen port |
| `CORS_ORIGIN` | `*` | Allowed origins (comma-separated in prod) |
| `LOG_LEVEL` | info | pino level |
| `DEFAULT_DAILY_ALERT_CAP` | 6 | Per-user daily push cap |

## Deploy

- **Gateway**: any container host. Stateless except in-memory demo state; scale
  behind a sticky-session LB for WebSockets, or a pub/sub fan-out when the
  in-memory hub and counters are replaced with Redis.
- **Surfaces**: static build (`npm run build`) to any CDN, or the nginx image.
