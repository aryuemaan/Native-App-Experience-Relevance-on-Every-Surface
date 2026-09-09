import SwiftUI
import WidgetKit

// Three widget families — all personal, none generic:
//   • My Slip     — status of the user's open bets + live cash-out value
//   • My Teams    — live scores for followed teams only
//   • Boosted for You — a single, capped, followers-only price boost
// In production each reads the latest snapshot the app wrote to a shared App
// Group container (updated from the gateway stream). The Care Gate decided,
// server-side, whether the boost snapshot exists at all.

struct PulseEntry: TimelineEntry {
    let date: Date
    let home: String
    let away: String
    let homeScore: Int
    let awayScore: Int
    let minute: Int
    let ticketValue: Double
    let slipStatus: String
    let boostLabel: String?
}

struct PulseProvider: TimelineProvider {
    func placeholder(in c: Context) -> PulseEntry { sample }
    func getSnapshot(in c: Context, completion: @escaping (PulseEntry) -> Void) { completion(sample) }
    func getTimeline(in c: Context, completion: @escaping (Timeline<PulseEntry>) -> Void) {
        completion(Timeline(entries: [sample], policy: .after(.now.addingTimeInterval(60))))
    }
    private var sample: PulseEntry {
        .init(date: .now, home: "Slavia", away: "Sparta", homeScore: 1, awayScore: 0,
              minute: 58, ticketValue: 18.9, slipStatus: "1 live",
              boostLabel: "Slavia BTTS 1.90 → 2.20")
    }
}

// MARK: - My Teams

struct MyTeamsWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "MyTeamsWidget", provider: PulseProvider()) { e in
            VStack(alignment: .leading, spacing: 6) {
                Label("\(e.minute)'", systemImage: "circle.fill")
                    .font(.caption2.bold()).foregroundStyle(.green).labelStyle(.titleAndIcon)
                Text("\(e.home) \(e.homeScore):\(e.awayScore) \(e.away)").font(.headline)
            }
            .padding(12).containerBackground(.black.gradient, for: .widget)
        }
        .configurationDisplayName("My Teams")
        .description("Live scores for the teams you follow.")
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryRectangular])
    }
}

// MARK: - My Slip

struct MySlipWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "MySlipWidget", provider: PulseProvider()) { e in
            VStack(alignment: .leading, spacing: 6) {
                Text("MY SLIP").font(.caption2.bold()).foregroundStyle(.secondary)
                Text("Cash out €\(e.ticketValue, specifier: "%.2f")")
                    .font(.headline).foregroundStyle(.green)
                Text("\(e.slipStatus) · \(e.home) \(e.homeScore):\(e.awayScore)").font(.caption)
            }
            .padding(12).containerBackground(.black.gradient, for: .widget)
        }
        .configurationDisplayName("My Slip")
        .description("Your open bets and live cash-out value.")
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryRectangular])
    }
}

// MARK: - Boosted for You (only rendered when a snapshot exists)

struct BoostWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "BoostWidget", provider: PulseProvider()) { e in
            VStack(alignment: .leading, spacing: 6) {
                Text("BOOSTED FOR YOU").font(.caption2.bold()).foregroundStyle(.orange)
                Text(e.boostLabel ?? "No boost right now").font(.subheadline.bold())
            }
            .padding(12).containerBackground(.black.gradient, for: .widget)
        }
        .configurationDisplayName("Boosted for You")
        .description("A single, capped price boost on a market you follow.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

@main
struct PulseWidgetBundle: WidgetBundle {
    var body: some Widget {
        MyTeamsWidget()
        MySlipWidget()
        BoostWidget()
        if #available(iOS 16.1, *) { MatchLiveActivity() }
    }
}
