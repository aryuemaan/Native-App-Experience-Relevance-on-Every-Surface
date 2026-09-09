import Foundation

// On-wire model, mirroring the gateway's domain types. Shared by the app, the
// widget extension, the Live Activity and the watch so there is one source of
// truth. The Care Gate runs server-side; every Moment here is already vetted.

public enum Surface: String, Codable, Sendable {
    case watch, widget, quick_action, live_activity, dynamic_island, push
}
public enum ContentClass: String, Codable, Sendable {
    case informational, inducement
}
public enum WidgetFamily: String, Codable, Sendable {
    case slip, teams, boost
}
public enum EventKind: String, Codable, Sendable {
    case fixture_upcoming, live_activity_start, score_update, odds_move
    case cashout_window, ticket_settled, reward_expiring, geo_shortcut, boost_offer
}

public struct Reason: Codable, Sendable, Hashable {
    public let code: String
    public let message: String
}

public struct Moment: Codable, Sendable, Identifiable {
    public let id: String
    public let userId: String
    public let kind: EventKind
    public let contentClass: ContentClass
    public let surface: Surface
    public let widgetFamily: WidgetFamily?
    public let title: String
    public let body: String
    public let reasons: [Reason]
    public let createdAt: String
}

struct MomentEnvelope: Codable {
    let type: String
    let moment: Moment?
}

public struct SlipStatus: Codable, Sendable {
    public let spoken: String
}
