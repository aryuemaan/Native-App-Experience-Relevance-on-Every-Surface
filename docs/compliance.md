# FEG Pulse - Compliance Note

**Scope.** FEG Pulse places a user's own sports and gaming activity - followed teams, open slip, live cash-out value, favourite slots, followed tournaments, live-dealer tables - onto ambient OS surfaces (widgets, Live Activity, Dynamic Island, watch, voice, geolocation shortcuts) across FEG's regulated CEE markets (CZ, SK, PL, RO, HR, and LT via TOPsport). It is pull, not push: a surface can only ever reflect something the user chose to follow, so no server-side segmentation can attach content to an interest the user never selected.

**Design principle.** Compliance is enforced in one kernel - the Care Gate - through which every candidate render must pass. Nothing reaches a surface without a recorded, inspectable decision. Each decision emits a machine-readable reason code into an audit trail exposed at `GET /api/users/:id/audit`, giving every surface a "why am I seeing this?" answer. Guarantees are pinned by automated tests (31 in the Rust gateway, 40 in the TypeScript gateway).

## EU baseline

- **GDPR - lawful basis and consent.** Personalised surfaces require explicit, granular consent. Consent is captured per purpose and per surface (Live Activity/Dynamic Island, widgets, watch, geolocation), and any missing layer blocks the render (`CONSENT_PERSONALISATION_MISSING`, `CONSENT_SURFACE_OFF`). Marketing/inducement content additionally requires marketing consent (`CONSENT_MARKETING_MISSING`).
- **IAB TCF v2.2.** The transparency and consent framework version is enforced; absent purpose consent blocks any personalised surface (`CONSENT_TCF_PURPOSE_MISSING`). The TCF version is configurable per deployment.
- **Data minimisation and purpose limitation.** The interest and activity graph is designed to live as short-lived tokens on device; the server keeps no persistent marketing profile. Spend, loss, balance, deposit and net-position fields are stripped from every ambient payload (`FINANCIALS_STRIPPED`) so financial data never appears on a lock screen or shared surface.
- **Geolocation / ePrivacy.** Location is consumed only as a derived proximity flag (for example "near a shop"), never as raw coordinates, and only when the geolocation surface is consented.
- **Right to withdraw, access and erasure.** Consent is revocable per surface at any time and takes effect immediately on the next decision; because there is no persistent profile, erasure is the removal of on-device tokens and the user's graph entries.

## Responsible gambling

- **Zero inducement to protected users, by construction.** Self-excluded, at-risk (high-risk) and deposit-limit-reached users receive no inducements in either vertical. There is no code path from an inducement event (boost, slot promo, limited-seat alert, live-dealer join offer, bonus, jackpot) to a surface for these users; the only outcome is an audited block (`RG_SELF_EXCLUDED`, `RG_AT_RISK`, `RG_DEPOSIT_LIMIT_REACHED`).
- **Informational continuity preserved.** Protected users still receive purely informational moments - a score, a settlement, a tournament start time, a new slot added to their library - rendered without any play/join call to action (`CTA_STRIPPED`). Protection removes inducements, not the user's own activity.
- **No dark patterns.** Urgency and pressure copy (loss-chasing, "last chance", countdown coercion) is rejected before it can become a moment (`CONTENT_DARK_PATTERN`).
- **Quiet hours and frequency caps.** No interruptive push is delivered during a user's quiet hours; a would-be push is downgraded to a silent surface rather than dropped (`QUIET_HOURS`, `DOWNGRADED_TO_SILENT`). Per-hour and per-day alert caps and per-offer frequency caps are enforced (`HOURLY_ALERT_CAP_REACHED`, `DAILY_ALERT_CAP_REACHED`, `OFFER_FREQUENCY_CAP_REACHED`).
- **Eligibility first.** KYC, age and market checks gate every surface; an unverified or out-of-market account receives nothing at all (`ELIGIBILITY_NOT_VERIFIED`).
- **Safer convenience.** One-tap actions are limited to risk-neutral or risk-reducing operations (cash-out, follow). The repeat-bet convenience is blocked for RG-protected users.

**Assurance.** Every guarantee above maps to a reason code and at least one test; the mapping is maintained in `docs/compliance-map.md`. Configuration (quiet hours, caps, TCF version, RG flags) is environment-driven, so market-specific regulatory thresholds can be tuned without code changes. This note reflects the enforced behaviour of the shipped prototype, not an aspiration.