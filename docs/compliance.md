# Compliance by design — one page

OS surfaces are the customer's personal space. FEG Pulse treats that as a hard
constraint, not a setting. Every guarantee below is enforced in code by the
**Care Gate** (`services/gateway/src/domain/careGate.ts`) or its sibling guards,
and is covered by tests (`services/gateway/src/__tests__/`).

## GDPR / consent — granular, per surface

Live Activities, widgets, watch and geolocation are **opt-in per surface, not one
master toggle**, and revocable in one tap (`PUT /api/users/:id/consent`).
Withdrawal takes effect on the next evaluation. Personalisation consent is a
prerequisite for any personalised surface at all.

| Rule | Reason code | Test |
| --- | --- | --- |
| No surface without personalisation consent | `CONSENT_PERSONALISATION_MISSING` | careGate |
| A surface the user switched off never renders | `CONSENT_SURFACE_OFF` | careGate |
| Geolocation stays on-device (see below) | — | — |

Geolocation is never logged server-side: the **device** derives a context flag
(`near_shop` / `at_stadium`) and posts only that flag — never raw coordinates
(`POST /api/users/:id/context/location`). Purpose-limited per Art. 5.

## No dark patterns

Ambient surfaces show **status** — score, slip result, cash-out value — never
urgency language, countdown pressure or loss-chasing framing. A tone linter
(`domain/tone.ts`) rejects any copy containing pressure phrasing before it can
become a moment.

| Rule | Reason code | Test |
| --- | --- | --- |
| Urgency / pressure copy is rejected outright | `CONTENT_DARK_PATTERN` | momentRouter (`rejects a pushy promo`) |

## Responsible gaming — enforced at the data layer

Self-exclusion / at-risk / limit flags **hard-block** the inducement class and
the "repeat bet" action at the data layer — not hidden in the UI. Informational
continuity (score, slip status) is deliberately preserved for these users.

| Rule | Reason code | Test |
| --- | --- | --- |
| No boost to a self-excluded user | `RG_SELF_EXCLUDED` | careGate |
| No boost to an at-risk user | `RG_AT_RISK` | careGate |
| No boost after a deposit/spend limit | `RG_DEPOSIT_LIMIT_REACHED` | careGate |
| "Repeat bet" blocked for protected users | (403 at `/repeat-bet`) | graph |
| Score / slip still flow to a self-excluded user | `ALLOWED_INFORMATIONAL` | careGate (`STILL allows…`) |

## Quiet hours & frequency caps

Quiet hours suppress the only interruptive surface (`push`); silent surfaces
still update. The "Boosted for You" frequency cap is **backend-enforced** (a
weekly counter in the gateway), never client-trusted.

| Rule | Reason code | Test |
| --- | --- | --- |
| No interruptive push inside quiet hours | `QUIET_HOURS` | careGate |
| Daily push cap respected | `DAILY_ALERT_CAP_REACHED` | careGate |
| Weekly boost cap respected | `BOOST_WEEKLY_CAP_REACHED` | careGate + pipeline |

## No spend / loss on ambient surfaces

Lock screen and watch never normalise loss-chasing visibility. Any spend / loss /
balance field is stripped from the payload before it reaches a surface — only
slip status, score and cash-out value (money the user would receive) may appear.

| Rule | Reason code | Test |
| --- | --- | --- |
| Spend/loss fields stripped from ambient payloads | `FINANCIALS_STRIPPED` | momentRouter (`strips spend/loss`) |

## Age / market gating

OS surfaces respect the same jurisdiction and KYC-verified-age gates as the core
app. A widget or Live Activity **cannot exist** for an unverified or out-of-market
account — the Care Gate returns before any surface is chosen.

| Rule | Reason code | Test |
| --- | --- | --- |
| No surface for an unverified / out-of-market account | `ELIGIBILITY_NOT_VERIFIED` | careGate + pipeline (`blocks ALL surfaces… (Jakub)`) |

## Why this is a mechanism, not a promise

The inducement class is separate from the informational class, and there is **no
parameter, campaign flag or "win-back" override** that re-enables inducements for
a protected user. The suppression is demonstrable live (flip a flag in the demo
and watch the boost vanish while the score keeps updating) and every decision —
allowed or blocked — is written to an append-only audit log powering the
in-product "why am I seeing this?" trail.
