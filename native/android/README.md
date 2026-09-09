# PSK Pulse — native Android app

A standalone native Android app (Kotlin + Jetpack Compose) for the FEG / PSK
"Native App Experience — Relevance on Every Surface" challenge.

The headline surfaces:

- **Live Update notification** (Android's Dynamic-Island-class surface): a rich,
  ongoing notification that shows the live score, minute, and a live cash-out
  value for a bet the user placed, with a one-tap **Isplati** (Cash Out) action
  that settles the ticket without opening the app. Maintained by a foreground
  service so it stays alive on the lock screen and status bar while the match runs.
- **Three home-screen / lock-screen widgets** (Jetpack Glance): *Moji timovi*
  (live score for a followed team), *Moj listić* (live cash-out value of the open
  slip), and *Boost za tebe* (a capped, followers-only boosted-odds card).
- **Voice slip** (in-app "Ask Siri"-style sheet) reading back the slip status.
- **Geolocation context shortcut** ("Blizu poslovnice") that only ever sends a
  derived flag to the backend, never raw coordinates.

Everything is gated by the same compliance kernel that runs in the gateway
(the **Care Gate**): no inducement ever reaches a self-excluded user, a user who
has hit a deposit limit, or an unverified account — enforced server-side and
demonstrable live from the in-app console.

## Prerequisites

- Android Studio (Koala 2024.1.1 or newer). It bundles/manages Gradle for you.
- An Android device or emulator on **API 26+** (Android 8.0+). The Live Update
  notification renders as a rich ongoing notification on all of these; on
  Android 16 it is additionally promoted to a system Live Update.
- The gateway running (see `services/gateway`). Start it first.

## 1. Start the backend

From the repo root:

```
cd services/gateway
npm install
npm run start
```

The gateway listens on port 8080 and streams live moments over WebSocket.

## 2. Point the app at the gateway

The app defaults the gateway URL per target:

- **Emulator:** `http://10.0.2.2:8080` (the emulator's alias for your machine's
  localhost). No change needed — just run.
- **Physical phone:** the phone must reach your computer over the same network.
  Find your machine's LAN IP (e.g. `192.168.1.42`) and set the gateway URL to
  `http://192.168.1.42:8080`. You can change it at runtime — the value is stored
  in DataStore (`Config.DEFAULT_GATEWAY` in `data/PulseStore.kt` is the default).

Cleartext HTTP to a LAN IP is enabled for the demo via
`android:usesCleartextTraffic="true"`.

## 3. Open and run

1. In Android Studio: **File > Open** and select `native/android`.
2. Let Gradle sync. On first import Android Studio will create the Gradle wrapper
   if it is not present. (If you build from the CLI instead, run `gradle wrapper`
   once in this folder, then `./gradlew installDebug`.)
3. Press **Run**. Grant the notification permission when prompted (Android 13+).

## 4. Walk the scenario (Vječni derbi — Dinamo vs Hajduk)

1. Pick the bettor **Marko** (top row).
2. Tap **Prati uživo**. This starts the scripted derby and launches the Live
   Update foreground service. Pull down the shade / look at the lock screen:
   the score notification appears and updates (0:0 → Dinamo 1:0), the cash-out
   value climbs, and the **Isplati** button is live.
3. Tap **Isplati** from the notification. The ticket settles; the notification
   flips to *Namireno* and the in-app card follows.
4. Add the widgets: long-press the home screen > Widgets > PSK Pulse, drop
   *Moji timovi*, *Moj listić*, and *Boost za tebe*. They reflect the same live
   state.
5. **Compliance, by design:** switch to **Iva** (self-excluded) or **Tomislav**
   (deposit-limit reached) and tap **Pošalji boost** — nothing renders and the
   decision log shows `RG_SELF_EXCLUDED` / `RG_DEPOSIT_LIMIT_REACHED`, while the
   *score* still surfaces. Switch to **Josip** (KYC off) and start a match — no
   surface is produced (`ELIGIBILITY_NOT_VERIFIED`). Tap the aggressive promo to
   see it rejected as `CONTENT_DARK_PATTERN`.

## Parity with the iOS reference

| Capability                     | iOS                              | Android                                   |
|--------------------------------|----------------------------------|-------------------------------------------|
| Live score + cash-out surface  | Live Activity + Dynamic Island   | Live Update ongoing notification (FGS)    |
| One-tap cash out, no app open  | App Intent button                | Notification action -> BroadcastReceiver  |
| Widgets (slip / teams / boost) | WidgetKit                        | Jetpack Glance                            |
| Voice                          | App Shortcuts / Siri             | In-app voice slip sheet                   |
| Compliance kernel              | Shared gateway Care Gate         | Shared gateway Care Gate                  |

## Where real data plugs in

The scripted derby lives in the gateway (`services/gateway/src/domain/feed.ts`)
and the fixtures/odds in `services/gateway/src/data/matches.ts`. Swap either for
a real provider (for example API-Football) behind the same event shapes and the
app needs no changes — it only ever consumes the gateway's normalised moments.

Note: this project is provided as complete, idiomatic source. It was not compiled
in the authoring sandbox (no Android SDK there); open it in Android Studio, which
resolves the SDK and Gradle for you.
