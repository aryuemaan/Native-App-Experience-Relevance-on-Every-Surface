use chrono::{TimeZone, Utc};
use serde_json::Value;

use feg_pulse_gateway::config::Config;
use feg_pulse_gateway::domain::pipeline::process;
use feg_pulse_gateway::domain::types::{EventKind, RawEvent, Vertical};
use feg_pulse_gateway::state::AppState;

fn event(user_id: &str, kind: EventKind, title: &str, body: &str) -> RawEvent {
    RawEvent {
        id: format!("evt_{}_{}", user_id, title.len()),
        user_id: user_id.to_string(),
        kind,
        title: title.to_string(),
        body: body.to_string(),
        cta: None,
        data: Value::Null,
    }
}

fn daytime() -> chrono::DateTime<Utc> {
    Utc.with_ymd_and_hms(2026, 9, 9, 10, 0, 0).unwrap()
}

#[test]
fn moment_fans_out_to_subscriber() {
    let state = AppState::new(Config::default());
    let mut rx = state.hub.subscribe("marek");
    let out = process(&state, event("marek", EventKind::ScoreUpdate, "GOL", "Dinamo 1:0"), daytime());
    assert!(out.is_some());
    let received = rx.try_recv().expect("subscriber should receive moment");
    assert_eq!(received.vertical, Vertical::Sports);
    assert_eq!(received.user_id, "marek");
}

#[test]
fn fanout_is_followed_only_isolated_per_user() {
    let state = AppState::new(Config::default());
    let mut rx_marek = state.hub.subscribe("marek");
    let mut rx_eva = state.hub.subscribe("eva");
    process(&state, event("marek", EventKind::ScoreUpdate, "GOL", "Dinamo 1:0"), daytime());
    assert!(rx_marek.try_recv().is_ok());
    assert!(rx_eva.try_recv().is_err());
}

#[test]
fn gaming_moment_fans_out() {
    let state = AppState::new(Config::default());
    let mut rx = state.hub.subscribe("marek");
    let out = process(
        &state,
        event("marek", EventKind::SlotRelease, "Nova igra", "Wanted Dead or a Wild"),
        daytime(),
    );
    assert!(out.is_some());
    let received = rx.try_recv().expect("gaming moment should arrive");
    assert_eq!(received.vertical, Vertical::Gaming);
}

#[test]
fn suppressed_inducement_not_emitted_but_audited() {
    let state = AppState::new(Config::default());
    let mut rx = state.hub.subscribe("eva");
    let out = process(&state, event("eva", EventKind::BoostOffer, "Boost", "Rijeka pobjeda"), daytime());
    assert!(out.is_none());
    assert!(rx.try_recv().is_err());
    let audit = state.audit_for("eva");
    assert!(audit.iter().any(|r| !r.allowed));
}

#[test]
fn gaming_inducement_suppressed_for_deposit_limit_user() {
    let state = AppState::new(Config::default());
    let mut rx = state.hub.subscribe("tomas");
    let out = process(
        &state,
        event("tomas", EventKind::TournamentSeatsLow, "Daily Kokice Cup", "12 mjesta"),
        daytime(),
    );
    assert!(out.is_none());
    assert!(rx.try_recv().is_err());
}

#[test]
fn dark_pattern_copy_rejected_and_audited() {
    let state = AppState::new(Config::default());
    let out = process(
        &state,
        event("marek", EventKind::BoostOffer, "ZADNJA PRILIKA!!!", "deposit now"),
        daytime(),
    );
    assert!(out.is_none());
    let audit = state.audit_for("marek");
    assert!(audit
        .iter()
        .any(|r| !r.allowed && r.reasons.iter().any(|x| format!("{:?}", x.code).contains("ContentDarkPattern"))));
}
