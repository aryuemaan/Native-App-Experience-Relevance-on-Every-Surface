# Architecture

FEG Pulse turns the phone's own surfaces into a live extension of the FEG apps.
The design principle is **pull, not push**: the user's followed teams, their open
slip and their live cash-out value appear where they already look — so they never
open a third-party score app to check a bet they already hold.

## Pipeline

```
Interest & Activity Graph   (follows · open tickets w/ live value · rewards · boosts)
          │
          ▼
Live Event Stream           (followed-only fan-out: score / odds / cash-out / settle)
          │
          ▼
Content Classifier          (INFORMATIONAL vs INDUCEMENT)
          │
          ▼
Moment Router  ── proposes the least-intrusive surface for the event kind
          │        (watch → widget → quick_action → live_activity → dynamic_island → push)
          ▼
┌───────────────────────────────────────────────┐
│                  CARE GATE                      │  0 eligibility (KYC/age/market)
│  the single kernel every render passes through  │  1 personalisation consent
│                                                 │  2 per-surface consent
│   + tone linter (no dark patterns)              │  3 inducement gating (RG / marketing / cap)
│   + financial strip (no spend/loss ambient)     │  4 quiet hours + push cap
└───────────────────────────────────────────────┘
          │  (allowed only)
          ▼
Moment Router.finalise      (escalate time-critical info → push; downgrade if not allowed)
          │
          ▼
Surfaces                    lock/home widgets (My Slip · My Teams · Boosted for You) ·
                            Live Activity / Dynamic Island (one-tap Cash Out) ·
                            watch complication (tap → cash out) ·
                            geolocation quick action · voice / App Intents
```

## Invariants that make occupying the lock screen defensible

1. **The Care Gate is the only path to a surface.** Nothing renders except via
   `pipeline.process → careGate.evaluate`. A blocked event is audited but there
   is no code path from a blocked inducement to a device.
2. **Two content classes.** Informational content reflects the user's own choices
   and flows to everyone who consented (including self-excluded users — their
   score still updates). Inducements are a separate class the Care Gate switches
   off for a whole cohort by construction.
3. **The device never re-decides.** The Care Gate runs server-side; native
   clients only mirror already-vetted moments onto the least-intrusive surface.
   Compliance logic lives in one tested place, not duplicated across iOS / Android.
4. **User actions are server-authoritative.** Cash-out and repeat-bet run through
   the gateway, so the RG guardrail on "repeat bet" and eligibility on cash-out
   cannot be bypassed by a client.

## Components

| Component | Tech | Role |
| --- | --- | --- |
| `services/gateway` | Node 20 · TS · Fastify · WebSocket | Graph, event stream, Care Gate, tone linter, Moment Router, audit, REST + streaming |
| `apps/surface-demo` | Vite · React · TS | Interactive OS-surface demo; runs on a real phone via LAN |
| `native/ios` | SwiftUI · WidgetKit · ActivityKit · App Intents | Production surfaces incl. interactive Cash Out |
| `native/android` | Compose · Glance · (Live Updates) | Production surfaces incl. Cash Out action |

## Scaling notes (production)

- The in-memory `Graph`, `AuditLog` and boost counters sit behind narrow
  interfaces — swap for the operator's profile store, an append-only audit sink
  and a shared counter (Redis) for multi-instance frequency caps.
- The scripted `feed` becomes a followed-only consumer of the existing
  score / odds / settlement bus; per-user fan-out already lives in `stream/hub`.
- The Care Gate and tone linter are pure and unit-tested, so they run identically
  in the gateway and, if ever needed, as a shared edge module.
