# FEG Pulse - Your Bet, Everywhere You Look

Make FEG the live scoreboard of the user's phone. A bettor should never open
Flashscore or ESPN to check a match they already have a bet on, and a casino
player should never miss the tournament they follow because the app was closed.
FEG Pulse mirrors the user's followed teams, open slip, live cash-out value,
favourite slots, followed tournaments and live-dealer tables onto the surfaces
they already look at - lock screen, home-screen widgets, Live Activity / Dynamic
Island, watch and voice - and lets them act with one tap, without opening the app.

The wedge is not better notifications. It is replacing a habit - the reflex of
opening a third-party score app or forgetting a tournament - not re-engaging a
dormant one. This is pull, not push: a surface can only ever reflect something the
user chose to follow.

Because these surfaces are personal space, every render passes through one tested
compliance kernel - the Care Gate - that blocks inducements for self-excluded,
at-risk and limit-reached users by construction, enforces granular per-surface
GDPR / IAB TCF v2.2 consent, rejects dark-pattern copy, keeps spend / loss off
ambient surfaces, respects quiet hours and frequency caps, and logs a
"why am I seeing this?" trail for every decision.

## 30-second pitch

Sports and gaming, one model. The user's interests, surfaces and compliance state
live in a single knowledge graph. A Moment Router places each event on the
least-intrusive surface that fits, and the Care Gate decides whether it may render
at all. Informational continuity (a score, a tournament starting, a new slot in
your library) always flows to eligible users. Inducements (boosts, limited seats,
join offers, bonuses) are a separate, hard-gated class that simply cannot reach a
protected user - the only outcome is an audited block.

## Quickstart

```bash
docker compose up --build
# open http://localhost:5173  (on a phone: http://<your-LAN-ip>:5173)
```

Or run the pieces directly:

```bash
make install      # install both node projects
make gateway      # TypeScript gateway on :8080 (the live-demo backend)
make web          # React demo on :5173
make test-all     # TypeScript (40) + Rust (31) test suites
make graph        # print the knowledge graph as Mermaid
```

## Two gateways, one API

Both gateways expose an identical REST + WebSocket API and the same gaming vertical.

- `services/gateway` (TypeScript, Fastify) is the live-demo backend. It is the
  proven, fast-to-iterate runtime the React demo talks to on `:8080`, so the demo
  never regresses. 40 tests.
- `services/gateway-rs` (Rust, tokio + axum) is the production and
  tech-feasibility path: a single-binary gateway with a `petgraph` knowledge graph,
  per-user WebSocket fan-out, the 11-laps odds-feed seam, and the full Care Gate.
  31 tests. Runs on `:8080` by default (mapped to `:8081` in compose so it can run
  beside the TypeScript gateway).

To point the demo at the Rust gateway instead, set `VITE_GATEWAY_URL` to its URL.

## Architecture

```mermaid
graph TD
  feed["11-laps odds feed (stub or live)"] --> ev["Raw events (sports + gaming)"]
  ev --> cls["Content class: informational vs inducement"]
  cls --> router["Moment Router: least-intrusive surface"]
  router --> gate["Care Gate: eligibility, consent, TCF, RG, quiet hours, caps"]
  gate -->|allowed| fin["Finalise surface + strip financials / CTAs"]
  gate -->|blocked| audit["Audit only, never emitted"]
  fin --> hub["Per-user stream hub"]
  fin --> audit
  hub --> surfaces["Widgets, Live Activity, Dynamic Island, Watch, Quick actions, Push"]
  graph["Knowledge graph (users, interests, surfaces, RG/consent)"] --- router
  graph --- gate
```

The pipeline is total: every event ends as either an emitted moment or an audited
block, and both carry the full reason trail.

## Gaming

The gaming vertical covers casino and live casino: new slot releases, slot promos,
tournament start and limited-seat alerts, live-dealer table openings and join
offers, and bonus drops. Each has an informational form that flows to eligible
users (including at-risk ones, without a play/join CTA) and, where relevant, an
inducement twin that is hard-gated. Gaming surfaces mirror sports: a My Games
widget, a tournament Live Activity, a live-dealer Dynamic Island. Try it from the
Gaming tab in the demo, or:

```bash
curl -s localhost:8080/api/gaming/catalog
curl -s -X POST localhost:8080/api/demo/marek/gaming -H 'content-type: application/json' -d '{"scenario":"tournament"}'
```

## Knowledge graph

The interest and activity graph is the source of truth for routing and for the
"inducements blocked" property. It exports as JSON (`GET /api/graph`) and Mermaid
(`GET /api/graph?format=mermaid` or `make graph`). See
[docs/knowledge-graph.md](docs/knowledge-graph.md) for the entity / relationship
model and the generated seed diagram (26 nodes, 41 edges).

## Compliance by design

Every guarantee maps to a reason code and a test. See
[docs/compliance-map.md](docs/compliance-map.md). Highlights: self-excluded,
at-risk and deposit-limit users receive zero inducements across both verticals;
TCF v2.2 purpose consent and per-surface consent are hard gates; dark-pattern copy
is rejected before it can become a moment; financial data never reaches an ambient
surface; quiet hours and frequency caps downgrade rather than drop; and the
repeat-bet convenience is blocked for RG-protected users.

## Business case

On 500k MAU the model projects roughly EUR 1.39M / year of incremental value,
against roughly EUR 300k to build, for a payback of about 2.6 months, scaling to
about 3x at 1.5M users. The gaming vertical adds tournament re-entry and live-table
occupancy as pull surfaces that today rely on interruptive push. See
[docs/impact.md](docs/impact.md).

## Why this wins (judging criteria)

- Business value: replaces a habit rather than re-engaging a dormant user, across
  both sports and gaming, with a concrete ROI model.
- Customer experience: one-tap cash-out and one-tap continuity from ambient
  surfaces, no app launch.
- Originality: a compliance kernel as the enabling feature, not an afterthought;
  pull-not-push falls out of the graph model.
- Technical feasibility: two runnable gateways (one in Rust), 71 tests across them,
  native iOS and Android reference apps, a live WebSocket demo.
- Product completeness: sports and gaming, watch to voice, with a decision log.
- Compliance by design: enforced in code and pinned by tests, not asserted in
  slides.

## Running the native apps (reference)

The `native/ios` (SwiftUI + ActivityKit + App Intents) and `native/android`
(Compose + Glance + Live Updates) apps are production-path references that consume
the same gateway API. Open `native/ios` in Xcode or `native/android` in Android
Studio and point the app's gateway URL at your machine. They are illustrative and
are not built by CI.

## Repository layout

```
services/gateway      TypeScript gateway (live-demo backend)
services/gateway-rs   Rust gateway (production / tech-feasibility)
apps/surface-demo     React surface demo (phone + watch)
native/ios            SwiftUI reference app
native/android        Compose reference app
docs/                 architecture, compliance-map, knowledge-graph, impact, runbook, demo-script
```
