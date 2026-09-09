use chrono::{TimeZone, Utc};

use feg_pulse_gateway::domain::care_gate::evaluate;
use feg_pulse_gateway::domain::content_class::classify;
use feg_pulse_gateway::domain::types::*;
use feg_pulse_gateway::feed::seed::build_store;

fn user(id: &str) -> User {
    build_store().get_user(id).unwrap().clone()
}

fn ctx(intended: Surface) -> CareGateContext {
    CareGateContext {
        intended_surface: intended,
        hourly_alert_cap_reached: false,
        daily_alert_cap_reached: false,
        offer_cap_reached: false,
    }
}

fn daytime() -> chrono::DateTime<Utc> {
    Utc.with_ymd_and_hms(2026, 9, 9, 10, 0, 0).unwrap()
}

fn quiet_time() -> chrono::DateTime<Utc> {
    Utc.with_ymd_and_hms(2026, 9, 9, 2, 0, 0).unwrap()
}

fn has(d: &Decision, code: ReasonCode) -> bool {
    d.reasons.iter().any(|r| r.code == code)
}

#[test]
fn eligibility_blocks_unverified_account() {
    let u = user("jakub");
    let cc = classify(EventKind::ScoreUpdate);
    let d = evaluate(&u, cc, &ctx(Surface::LiveActivity), daytime());
    assert!(!d.allowed);
    assert!(has(&d, ReasonCode::EligibilityNotVerified));
}

#[test]
fn personalisation_consent_missing_blocks() {
    let mut u = user("marek");
    u.consent.personalisation = false;
    let cc = classify(EventKind::ScoreUpdate);
    let d = evaluate(&u, cc, &ctx(Surface::LiveActivity), daytime());
    assert!(!d.allowed);
    assert!(has(&d, ReasonCode::ConsentPersonalisationMissing));
}

#[test]
fn tcf_purpose_consent_missing_blocks() {
    let mut u = user("marek");
    u.consent.tcf_purpose_consent = false;
    let cc = classify(EventKind::ScoreUpdate);
    let d = evaluate(&u, cc, &ctx(Surface::LiveActivity), daytime());
    assert!(!d.allowed);
    assert!(has(&d, ReasonCode::ConsentTcfPurposeMissing));
}

#[test]
fn per_surface_consent_off_blocks_intended_surface() {
    let mut u = user("marek");
    u.consent.surfaces.widgets = false;
    let cc = classify(EventKind::FixtureUpcoming);
    let d = evaluate(&u, cc, &ctx(Surface::Widget), daytime());
    assert!(!d.allowed);
    assert!(has(&d, ReasonCode::ConsentSurfaceOff));
}

#[test]
fn sports_inducement_blocked_for_self_excluded() {
    let u = user("eva");
    let cc = classify(EventKind::BoostOffer);
    let d = evaluate(&u, cc, &ctx(Surface::Widget), daytime());
    assert!(!d.allowed);
    assert!(has(&d, ReasonCode::RgSelfExcluded));
}

#[test]
fn sports_inducement_blocked_for_deposit_limit() {
    let u = user("tomas");
    let cc = classify(EventKind::BoostOffer);
    let d = evaluate(&u, cc, &ctx(Surface::Widget), daytime());
    assert!(!d.allowed);
    assert!(has(&d, ReasonCode::RgDepositLimitReached));
}

#[test]
fn sports_inducement_blocked_for_high_risk() {
    let mut u = user("marek");
    u.rg.risk_level = RiskLevel::High;
    let cc = classify(EventKind::BoostOffer);
    let d = evaluate(&u, cc, &ctx(Surface::Widget), daytime());
    assert!(!d.allowed);
    assert!(has(&d, ReasonCode::RgAtRisk));
}

#[test]
fn sports_inducement_blocked_without_marketing_consent() {
    let mut u = user("marek");
    u.consent.marketing = false;
    let cc = classify(EventKind::BoostOffer);
    let d = evaluate(&u, cc, &ctx(Surface::Widget), daytime());
    assert!(!d.allowed);
    assert!(has(&d, ReasonCode::ConsentMarketingMissing));
}

#[test]
fn sports_inducement_allowed_for_eligible_user() {
    let u = user("marek");
    let cc = classify(EventKind::BoostOffer);
    let d = evaluate(&u, cc, &ctx(Surface::Widget), daytime());
    assert!(d.allowed);
    assert!(has(&d, ReasonCode::AllowedMarketingConsented));
}

#[test]
fn informational_always_allowed_for_eligible_user() {
    let u = user("marek");
    let cc = classify(EventKind::ScoreUpdate);
    let d = evaluate(&u, cc, &ctx(Surface::LiveActivity), daytime());
    assert!(d.allowed);
    assert!(has(&d, ReasonCode::AllowedInformational));
}

#[test]
fn quiet_hours_removes_alerting_but_allows_content() {
    let u = user("marek");
    let cc = classify(EventKind::CashoutWindow);
    let d = evaluate(&u, cc, &ctx(Surface::LiveActivity), quiet_time());
    assert!(d.allowed);
    assert!(!d.alerting_allowed);
    assert!(has(&d, ReasonCode::QuietHours));
}

#[test]
fn hourly_cap_removes_alerting() {
    let u = user("marek");
    let mut c = ctx(Surface::LiveActivity);
    c.hourly_alert_cap_reached = true;
    let cc = classify(EventKind::CashoutWindow);
    let d = evaluate(&u, cc, &c, daytime());
    assert!(d.allowed);
    assert!(!d.alerting_allowed);
    assert!(has(&d, ReasonCode::HourlyAlertCapReached));
}

#[test]
fn gaming_inducement_slot_promo_blocked_for_self_excluded() {
    let u = user("eva");
    let cc = classify(EventKind::SlotPromo);
    assert_eq!(cc, ContentClass::Inducement);
    let d = evaluate(&u, cc, &ctx(Surface::Widget), daytime());
    assert!(!d.allowed);
    assert!(has(&d, ReasonCode::RgSelfExcluded));
}

#[test]
fn gaming_inducement_seats_low_blocked_for_deposit_limit() {
    let u = user("tomas");
    let cc = classify(EventKind::TournamentSeatsLow);
    assert_eq!(cc, ContentClass::Inducement);
    let d = evaluate(&u, cc, &ctx(Surface::LiveActivity), daytime());
    assert!(!d.allowed);
    assert!(has(&d, ReasonCode::RgDepositLimitReached));
}

#[test]
fn gaming_informational_tournament_start_flows_for_at_risk() {
    let u = user("eva");
    let cc = classify(EventKind::TournamentStartingSoon);
    assert_eq!(cc, ContentClass::Informational);
    let d = evaluate(&u, cc, &ctx(Surface::LiveActivity), daytime());
    assert!(d.allowed);
    assert!(has(&d, ReasonCode::AllowedInformational));
}

#[test]
fn gaming_informational_slot_release_flows_for_at_risk() {
    let u = user("eva");
    let cc = classify(EventKind::SlotRelease);
    assert_eq!(cc, ContentClass::Informational);
    let d = evaluate(&u, cc, &ctx(Surface::Widget), daytime());
    assert!(d.allowed);
}
