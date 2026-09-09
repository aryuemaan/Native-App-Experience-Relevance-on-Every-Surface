use super::types::{ContentClass, EventKind, WidgetFamily};

pub fn classify(kind: EventKind) -> ContentClass {
    use EventKind::*;
    match kind {
        BoostOffer | SlotPromo | TournamentSeatsLow | LiveDealerJoinOffer | BonusDrop
        | JackpotAlert => ContentClass::Inducement,
        _ => ContentClass::Informational,
    }
}

pub fn widget_family_for(kind: EventKind) -> Option<WidgetFamily> {
    use EventKind::*;
    match kind {
        FixtureUpcoming => Some(WidgetFamily::Teams),
        TicketSettled | CashoutWindow | RewardExpiring => Some(WidgetFamily::Slip),
        BoostOffer => Some(WidgetFamily::Boost),
        SlotRelease | SlotPromo => Some(WidgetFamily::Games),
        TournamentStartingSoon | TournamentSeatsLow => Some(WidgetFamily::Tournaments),
        LiveDealerTableOpen | LiveDealerJoinOffer => Some(WidgetFamily::LiveDealer),
        BonusDrop | JackpotAlert => Some(WidgetFamily::Boost),
        _ => None,
    }
}
