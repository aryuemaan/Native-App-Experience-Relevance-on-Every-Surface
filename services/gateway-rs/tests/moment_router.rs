use feg_pulse_gateway::domain::content_class::{classify, widget_family_for};
use feg_pulse_gateway::domain::moment_router::{finalise_surface, intended_surface, is_time_critical};
use feg_pulse_gateway::domain::types::*;

fn decision(content_class: ContentClass, alerting: bool) -> Decision {
    Decision { allowed: true, content_class, alerting_allowed: alerting, reasons: vec![] }
}

#[test]
fn informational_time_critical_escalates_to_push() {
    let d = decision(ContentClass::Informational, true);
    assert!(is_time_critical(EventKind::CashoutWindow));
    assert_eq!(finalise_surface(EventKind::CashoutWindow, &d), Surface::Push);
}

#[test]
fn ticket_settled_escalates_to_push_when_allowed() {
    let d = decision(ContentClass::Informational, true);
    assert_eq!(finalise_surface(EventKind::TicketSettled, &d), Surface::Push);
}

#[test]
fn inducement_never_escalates_to_push() {
    let d = decision(ContentClass::Inducement, true);
    assert_eq!(finalise_surface(EventKind::BoostOffer, &d), Surface::Widget);
}

#[test]
fn quiet_hours_downgrades_would_be_push_to_silent() {
    let d = decision(ContentClass::Informational, false);
    assert_eq!(finalise_surface(EventKind::CashoutWindow, &d), Surface::LiveActivity);
}

#[test]
fn odds_move_targets_dynamic_island() {
    assert_eq!(intended_surface(EventKind::OddsMove), Surface::DynamicIsland);
}

#[test]
fn gaming_live_dealer_targets_dynamic_island() {
    assert_eq!(intended_surface(EventKind::LiveDealerTableOpen), Surface::DynamicIsland);
    let d = decision(ContentClass::Informational, true);
    assert_eq!(finalise_surface(EventKind::LiveDealerTableOpen, &d), Surface::DynamicIsland);
}

#[test]
fn gaming_slot_release_targets_widget_games_family() {
    assert_eq!(intended_surface(EventKind::SlotRelease), Surface::Widget);
    assert_eq!(classify(EventKind::SlotRelease), ContentClass::Informational);
    assert_eq!(widget_family_for(EventKind::SlotRelease), Some(WidgetFamily::Games));
}

#[test]
fn gaming_tournament_seats_low_targets_live_activity() {
    assert_eq!(intended_surface(EventKind::TournamentSeatsLow), Surface::LiveActivity);
    assert_eq!(classify(EventKind::TournamentSeatsLow), ContentClass::Inducement);
}

#[test]
fn geo_shortcut_targets_quick_action() {
    assert_eq!(intended_surface(EventKind::GeoShortcut), Surface::QuickAction);
}
