# Impact model (transparent, assumption-driven)

Judges trust a formula with FEG's real numbers dropped in far more than an
invented headline. So this is a **model, not a claim** — every input is labelled,
and the placeholders are flagged for FEG to replace with internal figures.

## Inputs (replace the placeholders)

| Input | Placeholder | Source |
| --- | --- | --- |
| Monthly active users (a single market, e.g. CZ) | `MAU = 500,000` *(placeholder — use FEG's actual figure)* | FEG internal |
| Share of MAU placing live / in-play bets weekly | `p_live = 15%` | FEG internal |
| Year-1 adoption of Live Activity + widgets among live bettors | `a = 25%` | Apple reports Live Activities materially lift return rate for sports apps |
| Incremental app opens per week per adopting user | `Δopens = +1.5` | conservative, instrument to confirm |
| OS-surface engagement vs push CTR | `~2×` (push ≈ 2–5%; rich OS surfaces commonly 15–30%+) | industry ranges |
| Blended incremental GGR per extra live session | `ARPDAU_live` *(use FEG's own)* | FEG internal |

## Formula

```
adopting_users      = MAU × p_live × a
incremental_opens/wk = adopting_users × Δopens
incremental_GGR/wk   = incremental_opens/wk × conversion_to_stake × ARPDAU_live
```

With the placeholders above:

```
adopting_users       = 500,000 × 0.15 × 0.25 = 18,750
incremental_opens/wk = 18,750 × 1.5          = 28,125 extra live sessions / week
incremental_GGR/wk   = 28,125 × (FEG conversion) × (FEG ARPDAU_live)
```

We deliberately stop before inventing a GGR figure — drop FEG's real
`conversion_to_stake` and `ARPDAU_live` in and the number is defensible.

## Payback logic

- **Build:** ~2 sprints for the MVP (iOS ActivityKit / WidgetKit + Android Live
  Updates / Glance) + 1 sprint hardening. No new backend infra if the gateway
  piggybacks on the existing live-odds feed.
- **Marginal cost:** negligible per session — OS surfaces carry no per-message
  cost like SMS/push infra.
- **Conclusion to present:** even a conservative **5–8% lift in weekly app opens
  among live bettors**, at existing conversion-to-stake rates, plausibly pays
  back a 6–8 week build within one quarter. Present it as this formula with FEG's
  own ARPDAU / CTR, not a fabricated absolute.

## What to instrument (already modelled in the demo's audit log)

- App opens / week (baseline vs adopting cohort)
- Live-moment funnel: Live Activity impressions → **cash-out taps**
- Widget adoption % and per-family split (My Slip / My Teams / Boosted for You)
- Tap-through from lock screen / Dynamic Island / watch
- Notification opt-in retention — expected to **rise**, because nothing here is an
  interruptive push
- Guardrail counts: suppressed inducements by reason code (a compliance KPI)
