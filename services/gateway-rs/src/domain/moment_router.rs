use super::types::{ContentClass, Decision, EventKind, Surface};

pub fn intended_surface(kind: EventKind) -> Surface {
    use EventKind::*;
    match kind {
        FixtureUpcoming => Surface::Widget,
        LiveActivityStart => Surface::LiveActivity,
        ScoreUpdate => Surface::LiveActivity,
        OddsMove => Surface::DynamicIsland,
        CashoutWindow => Surface::LiveActivity,
        TicketSettled => Surface::LiveActivity,
        RewardExpiring => Surface::Widget,
        GeoShortcut => Surface::QuickAction,
        BoostOffer => Surface::Widget,
        SlotRelease => Surface::Widget,
        SlotPromo => Surface::Widget,
        TournamentStartingSoon => Surface::LiveActivity,
        TournamentSeatsLow => Surface::LiveActivity,
        LiveDealerTableOpen => Surface::DynamicIsland,
        LiveDealerJoinOffer => Surface::DynamicIsland,
        BonusDrop => Surface::Widget,
        JackpotAlert => Surface::DynamicIsland,
    }
}

pub fn is_time_critical(kind: EventKind) -> bool {
    use EventKind::*;
    matches!(kind, TicketSettled | CashoutWindow | TournamentStartingSoon)
}

pub fn finalise_surface(kind: EventKind, decision: &Decision) -> Surface {
    let preferred = intended_surface(kind);
    let silent_fallback = Surface::LiveActivity;

    if is_time_critical(kind)
        && decision.alerting_allowed
        && decision.content_class == ContentClass::Informational
    {
        return Surface::Push;
    }

    if preferred == Surface::Push && !decision.alerting_allowed {
        return silent_fallback;
    }
    preferred
}
