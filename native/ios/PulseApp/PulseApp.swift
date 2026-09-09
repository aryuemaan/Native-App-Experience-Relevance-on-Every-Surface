import SwiftUI
import PulseKit

@main
struct PulseApp: App {
    var body: some Scene {
        WindowGroup { ContentView() }
    }
}

@MainActor
final class PulseModel: ObservableObject {
    @Published var moments: [Moment] = []
    @Published var connected = false

    private let client = GatewayClient(
        // Point at your gateway. For a device on your LAN use http://<LAN-ip>:8080.
        config: .init(baseURL: URL(string: "http://localhost:8080")!)
    )
    private let userId = "marek"

    func start() {
        client.connect(userId: userId) { [weak self] moment in
            Task { @MainActor in
                self?.connected = true
                self?.moments.insert(moment, at: 0)
                // A live in-play moment starts/updates the Live Activity.
                if moment.kind == .live_activity_start || moment.kind == .score_update
                    || moment.kind == .cashout_window || moment.kind == .odds_move {
                    LiveActivityController.shared.upsert(from: moment)
                }
                if moment.kind == .ticket_settled {
                    LiveActivityController.shared.end(from: moment)
                }
            }
        }
    }

    func runScenario() { Task { await client.startScenario(userId: userId) } }
}

struct ContentView: View {
    @StateObject private var model = PulseModel()

    var body: some View {
        NavigationStack {
            List {
                Section {
                    Button("▶ Start live match") { model.runScenario() }
                        .buttonStyle(.borderedProminent)
                }
                Section("Moments (post Care Gate)") {
                    ForEach(model.moments) { m in
                        VStack(alignment: .leading, spacing: 4) {
                            HStack {
                                Text(m.title).font(.headline)
                                Spacer()
                                Text(m.surface.rawValue)
                                    .font(.caption2).foregroundStyle(.secondary)
                            }
                            Text(m.body).font(.subheadline).foregroundStyle(.secondary)
                            // Provenance: "why am I seeing this?"
                            if let reason = m.reasons.first {
                                Text(reason.message)
                                    .font(.caption2).foregroundStyle(.tertiary)
                            }
                        }
                    }
                }
            }
            .navigationTitle("Fortuna Pulse")
        }
        .onAppear { model.start() }
    }
}
