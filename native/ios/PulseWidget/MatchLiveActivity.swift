import ActivityKit
import SwiftUI
import WidgetKit
import PulseKit

// MARK: - Live Activity attributes

/// State pinned to the lock screen and surfaced in the Dynamic Island while a
/// followed match is live. Only ever carries INFORMATIONAL content the user
/// already chose to follow — never an inducement.
public struct MatchAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        public var home: String
        public var away: String
        public var homeScore: Int
        public var awayScore: Int
        public var minute: Int
        public var ticketValue: Double
        public var oddsDelta: Double
        public var settled: Bool
    }
    public var fixtureId: String
}

// MARK: - Controller (called from the app when live moments arrive)

@MainActor
public final class LiveActivityController {
    public static let shared = LiveActivityController()
    private var activity: Activity<MatchAttributes>?

    public func upsert(from moment: Moment) {
        guard ActivityAuthorizationInfo().areActivitiesEnabled else { return }
        let state = MatchAttributes.ContentState(
            home: "Slavia", away: "Sparta", homeScore: 1, awayScore: 0,
            minute: 31, ticketValue: 14.2, oddsDelta: 0.4, settled: false
        )
        if let activity {
            Task { await activity.update(.init(state: state, staleDate: nil)) }
        } else {
            activity = try? Activity.request(
                attributes: MatchAttributes(fixtureId: moment.userId),
                content: .init(state: state, staleDate: nil)
            )
        }
    }

    public func end(from moment: Moment) {
        Task { await activity?.end(nil, dismissalPolicy: .after(.now + 30)) }
        activity = nil
    }
}

// MARK: - UI

struct MatchLiveActivityView: View {
    let state: MatchAttributes.ContentState
    private var arrow: String { state.oddsDelta > 0 ? "↑" : state.oddsDelta < 0 ? "↓" : "" }
    var body: some View {
        VStack(spacing: 10) {
            HStack {
                Text("\(state.home) \(state.homeScore):\(state.awayScore) \(state.away)")
                    .font(.headline)
                Spacer()
                Text("\(state.minute)'").font(.caption).foregroundStyle(.secondary)
            }
            HStack {
                Text("Cash out €\(state.ticketValue, specifier: "%.2f") \(arrow)")
                    .font(.subheadline.bold()).foregroundStyle(.green)
                Spacer()
                // Interactive App Intent button — cash out without launching the app (iOS 17+).
                if #available(iOS 17.0, *), !state.settled {
                    Button(intent: CashOutIntent()) { Text("Cash Out").bold() }
                        .buttonStyle(.borderedProminent).tint(.green)
                }
            }
        }
        .padding()
    }
}

@available(iOS 16.1, *)
struct MatchLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: MatchAttributes.self) { context in
            MatchLiveActivityView(state: context.state)
                .activityBackgroundTint(.black.opacity(0.6))
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Text("\(context.state.homeScore):\(context.state.awayScore)")
                        .font(.title2).bold()
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text("€\(context.state.ticketValue, specifier: "%.2f")")
                        .foregroundStyle(.green)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    HStack {
                        Text("\(context.state.home) vs \(context.state.away) · \(context.state.minute)'")
                            .font(.caption)
                        Spacer()
                        if #available(iOS 17.0, *), !context.state.settled {
                            Button(intent: CashOutIntent()) {
                                Text("Cash Out €\(Int(context.state.ticketValue))").font(.caption.bold())
                            }
                            .buttonStyle(.borderedProminent).tint(.green)
                        }
                    }
                }
            } compactLeading: {
                Text("\(context.state.homeScore):\(context.state.awayScore)").bold()
            } compactTrailing: {
                Text("€\(Int(context.state.ticketValue))").foregroundStyle(.green)
            } minimal: {
                Image(systemName: "sportscourt.fill")
            }
        }
    }
}
