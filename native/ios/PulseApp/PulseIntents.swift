import AppIntents
import PulseKit

// One-tap / voice actions the user initiates from a surface — pull, not push.
// The gateway remains the source of truth for eligibility and RG guardrails.

private let gateway = GatewayClient(config: .init(baseURL: URL(string: "http://localhost:8080")!))
private let demoUser = "marek"

/// Interactive Live Activity button + Siri: cash out without opening the app.
struct CashOutIntent: AppIntent {
    static var title: LocalizedStringResource = "Cash out my bet"
    static var openAppWhenRun: Bool = false

    func perform() async throws -> some IntentResult & ProvidesDialog {
        let ok = await gateway.cashout(userId: demoUser)
        return .result(dialog: ok ? "Done — your bet is cashed out." : "Couldn’t cash out right now.")
    }
}

/// "Hey Siri, what's my Fortuna slip?"
struct CheckMySlipIntent: AppIntent {
    static var title: LocalizedStringResource = "Check my slip status"
    static var openAppWhenRun: Bool = false

    func perform() async throws -> some IntentResult & ProvidesDialog {
        let spoken = await gateway.slipStatus(userId: demoUser)
        return .result(dialog: IntentDialog(stringLiteral: spoken))
    }
}

/// Repeat last bet — the gateway enforces the responsible-gambling guardrail;
/// a blocked user simply cannot complete the action.
struct RepeatBetIntent: AppIntent {
    static var title: LocalizedStringResource = "Repeat my last bet"
    static var openAppWhenRun: Bool = true

    func perform() async throws -> some IntentResult & ProvidesDialog {
        let allowed = await gateway.repeatBetAllowed(userId: demoUser)
        return .result(dialog: allowed
            ? "Opening your bet slip to confirm."
            : "This action isn’t available on your account.")
    }
}

struct PulseShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(intent: CheckMySlipIntent(),
                    phrases: ["Check my slip in \(.applicationName)"],
                    shortTitle: "Check slip", systemImageName: "ticket.fill")
        AppShortcut(intent: CashOutIntent(),
                    phrases: ["Cash out in \(.applicationName)"],
                    shortTitle: "Cash out", systemImageName: "banknote.fill")
    }
}
