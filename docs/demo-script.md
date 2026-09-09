# Demo script (15 minutes)

Backend for the live demo is the TypeScript gateway on `:8080`; the React demo is
on `:5173`. Start both with `make gateway` and `make web`, or `docker compose up`.
The Rust gateway can be shown separately as the production path.

## 0. Framing (1 min)

One line: FEG Pulse makes FEG the live scoreboard of the phone, for sports and
gaming, and every surface passes a tested compliance kernel. Point at the phone,
the watch and the decision log side by side.

## 1. Sports - the habit replacement (4 min)

Customer: Marek. Vertical tab: Sports.

1. Click Start live match. The pre-match My Teams widget is replaced by a Live
   Activity: GNK Dinamo vs HNK Hajduk, score, and a live cash-out value.
2. Watch the Dynamic Island and watch complication update as the goal and odds
   move. Nothing was pushed; these are ambient surfaces the user opted into.
3. When the cash-out window opens, click Cash Out on the Live Activity (or on the
   watch). The ticket settles on every surface at once, with no app launch. This
   is the one-tap, no-launch moment.
4. Click Ask Siri to show the spoken slip status (App Intents / voice surface).
5. Click Near a shop to show the consent-gated geolocation quick action (derived
   proximity only, never raw coordinates).

## 2. The Care Gate - compliance you can watch (4 min)

Still on Marek.

1. Click Send boost. An allowed, calm Boosted for You card appears - never a push.
   Tap Why am I seeing this to show the reason trail (ALLOWED_MARKETING_CONSENTED).
2. Click Try a pushy promo. Nothing renders. Open the decision log: the event is
   present but blocked with CONTENT_DARK_PATTERN. Dark-pattern copy never becomes a
   moment.
3. Switch customer to Eva (self-excluded). Send boost - blocked with
   RG_SELF_EXCLUDED in the log. Now click Start live match: the score and cash-out
   still flow. Protection removes inducements, not continuity.
4. Toggle Marketing consent or Deposit limit reached on Marek and re-send a boost
   to show the gate reacting live.

## 3. Gaming - same model, casino surfaces (4 min)

Switch the vertical tab to Gaming. Customer: Marek.

1. Click New slot drop. A My Games widget shows the new slot with its free-spins
   chip and a launch CTA (the allowed inducement twin).
2. Click Tournament seats. A tournament Live Activity shows Daily Kokice Cup, seats
   left and a Reserve seat CTA. The informational start-time twin flows first.
3. Click Live dealer opens. A live-dealer Dynamic Island shows Hrvatski Auto Rulet
   with the min bet and a Join CTA.
4. Switch customer to Eva and click New slot drop. Only the informational
   slot_release renders (no play CTA); the promo is suppressed. Open the log to see
   slot_release allowed and the promo blocked with RG_SELF_EXCLUDED. Switch to
   Tomas (deposit limit) and repeat to show RG_DEPOSIT_LIMIT_REACHED.

## 4. Under the hood (2 min)

1. `make graph` - print the knowledge graph as Mermaid; explain that routing and
   the inducements-blocked property both read this one model.
2. Mention the Rust gateway: same API, single binary, 31 tests, built for
   production throughput. `make test-all` runs both suites (40 + 31).
3. Close on the decision log: every surface in the whole demo has an inspectable
   reason, which is what makes this safe to ship on personal surfaces.
