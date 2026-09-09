# Compliance Map

Every guarantee FEG Pulse makes is enforced in the Care Gate kernel and pinned by
a test. This page maps each guarantee to its reason code and the test that proves
it. Reason codes are emitted verbatim into the audit log, so the "why" of every
decision is inspectable at `GET /api/users/:id/audit`.

Rust tests live in `services/gateway-rs/tests/`; TypeScript tests in
`services/gateway/src/__tests__/`. The Rust suite has 31 tests, the TypeScript
suite 40; both are green.

| Guarantee | Reason code | Proven by |
| --- | --- | --- |
| An unverified account (KYC / age / market) gets no surface at all | `ELIGIBILITY_NOT_VERIFIED` | `eligibility_blocks_unverified_account` |
| No personalisation consent means nothing renders | `CONSENT_PERSONALISATION_MISSING` | `personalisation_consent_missing_blocks` |
| IAB TCF v2.2 purpose consent is required for any personalised surface | `CONSENT_TCF_PURPOSE_MISSING` | `tcf_purpose_consent_missing_blocks` |
| Each surface has its own granular opt-in | `CONSENT_SURFACE_OFF` | `per_surface_consent_off_blocks_intended_surface` |
| Inducements require marketing consent | `CONSENT_MARKETING_MISSING` | `sports_inducement_blocked_without_marketing_consent` |
| Self-excluded users receive zero inducements (sports and gaming) | `RG_SELF_EXCLUDED` | `sports_inducement_blocked_for_self_excluded`, `gaming_inducement_slot_promo_blocked_for_self_excluded`, `suppressed_inducement_not_emitted_but_audited` |
| High-risk users receive zero inducements | `RG_AT_RISK` | `sports_inducement_blocked_for_high_risk` |
| Deposit-limit-reached users receive zero inducements (sports and gaming) | `RG_DEPOSIT_LIMIT_REACHED` | `sports_inducement_blocked_for_deposit_limit`, `gaming_inducement_seats_low_blocked_for_deposit_limit`, `gaming_inducement_suppressed_for_deposit_limit_user` |
| Offers are frequency-capped per user | `OFFER_FREQUENCY_CAP_REACHED` | enforced in `pipeline::process` via the store offer counter |
| No interruptive push inside quiet hours | `QUIET_HOURS` | `quiet_hours_removes_alerting_but_allows_content` |
| Hourly push cap | `HOURLY_ALERT_CAP_REACHED` | `hourly_cap_removes_alerting` |
| Daily push cap | `DAILY_ALERT_CAP_REACHED` | Care Gate daily-cap branch |
| A would-be push is downgraded to a silent surface, never dropped | `DOWNGRADED_TO_SILENT` | `quiet_hours_downgrades_would_be_push_to_silent` |
| Only informational, time-critical moments may escalate to push | (surface = `push`) | `informational_time_critical_escalates_to_push`, `inducement_never_escalates_to_push` |
| Urgency / pressure copy is rejected before it can become a moment | `CONTENT_DARK_PATTERN` | `dark_pattern_copy_rejected_and_audited` |
| Spend / loss / balance never reach an ambient surface | `FINANCIALS_STRIPPED` | `strip_sensitive_financials` in `domain/tone` |
| At-risk users keep informational continuity (score, tournament start, new slot) | `ALLOWED_INFORMATIONAL` | `gaming_informational_tournament_start_flows_for_at_risk`, `gaming_informational_slot_release_flows_for_at_risk` |
| Promotional CTAs are stripped from informational content | `CTA_STRIPPED` | `pipeline::process` CTA branch (cash-out CTA is exempt as RG-positive) |
| A suppressed inducement is never emitted but is always audited | (audit `allowed=false`) | `suppressed_inducement_not_emitted_but_audited` |
| Repeat-bet convenience is blocked for RG-protected users | route `403` | `POST /api/users/:id/repeat-bet` guard, `repeat_bet_allowed` |

## EU baseline mapping

- GDPR data minimization: the interest and activity graph is designed to live as
  short-lived tokens on device; the server keeps no persistent marketing profile,
  and financial fields are stripped from every ambient payload
  (`FINANCIALS_STRIPPED`). Geolocation is consumed as a derived proximity flag,
  never raw coordinates.
- GDPR lawful basis and consent (IAB TCF v2.2): personalisation, per-purpose and
  per-surface consent are all hard gates; `CONSENT_TCF_PURPOSE_MISSING` blocks any
  personalised surface when purpose consent is absent.
- Responsible gaming: self-exclusion, deposit limits and at-risk cohorts remove
  the inducement class by construction. There is no code path from an inducement
  event to a surface for these users; the only outcome is an audited block. At-risk
  users continue to receive purely informational continuity.

## Gaming-specific constraints

- Limited-seat and new-slot inducements (`slot_promo`, `tournament_seats_low`,
  `live_dealer_join_offer`, `bonus_drop`, `jackpot_alert`) are the inducement class
  and inherit every RG and consent gate above.
- The informational twins (`slot_release`, `tournament_starting_soon`,
  `live_dealer_table_open`) always flow to eligible users, including at-risk ones,
  and are rendered without a play/join CTA for the protected cohort.
- Gaming moments only exist for users who followed the slot, tournament or table,
  because the graph has no other edge that could attach them.
