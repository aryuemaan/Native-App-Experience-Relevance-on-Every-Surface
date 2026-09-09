# FEG Pulse — iOS reference app

Native reference implementation of the OS surfaces: a SwiftUI app, three
**WidgetKit** widget families, an **ActivityKit** Live Activity with an
**interactive Cash Out button** in the Dynamic Island, and **App Intents** for
one-tap cash-out and Siri.

> Requires **Xcode 15+** and an iOS 17 device/simulator. Not compiled by the
> repo's Node-only CI. The Swift is structured to drop straight into Xcode.

## Layout

| Path | Surface |
| --- | --- |
| `PulseKit/` | Shared models + resilient gateway client (cash-out, slip, repeat-bet); unit-tested SPM package |
| `PulseApp/PulseApp.swift` | SwiftUI app — subscribes to the moment stream, drives the Live Activity |
| `PulseApp/PulseIntents.swift` | App Intents: `CashOutIntent`, `CheckMySlipIntent`, `RepeatBetIntent` + Siri phrases |
| `PulseWidget/PulseWidget.swift` | Three widget families: My Slip · My Teams · Boosted for You |
| `PulseWidget/MatchLiveActivity.swift` | Live Activity + Dynamic Island with a one-tap Cash Out `Button(intent:)` |

## The headline interaction

The Live Activity and the Dynamic Island expanded view carry a
`Button(intent: CashOutIntent())` (iOS 17 interactive widgets). Tapping it runs
the App Intent, which calls the gateway's cash-out endpoint and settles the bet
**without launching the app** — the exact "cash out from the island" moment in
the demo script. The button is hidden once the ticket is settled.

## Build

```bash
brew install xcodegen        # once
cd native/ios
xcodegen generate            # creates FortunaPulse.xcodeproj
open FortunaPulse.xcodeproj  # set your Team + a real bundle id, then Run
```

Point `GatewayClient` at your running gateway. For a physical device use your
Mac's LAN IP instead of `localhost`, and add an ATS exception for local HTTP in
development. Run `swift test` inside `PulseKit/` for the decoding tests.

## The compliance boundary

The Care Gate runs server-side. By the time a `Moment` reaches the device it has
already been vetted, so the app only mirrors the user's own choices onto the
least-intrusive surface. The "Boosted for You" snapshot never exists for a
protected cohort — there is no client toggle that could re-enable it.
