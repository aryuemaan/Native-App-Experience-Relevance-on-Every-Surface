use chrono::{DateTime, Utc};
use uuid::Uuid;

use crate::domain::care_gate::evaluate;
use crate::domain::content_class::{classify, widget_family_for};
use crate::domain::moment_router::{finalise_surface, intended_surface};
use crate::domain::tone::{check_tone, strip_sensitive_financials};
use crate::domain::types::{
    AuditRecord, CareGateContext, ContentClass, EventKind, Moment, RawEvent, Reason, ReasonCode,
    Surface,
};
use crate::state::AppState;

fn id(prefix: &str) -> String {
    format!("{}{}", prefix, Uuid::new_v4().simple())
}

fn now_iso(now: DateTime<Utc>) -> String {
    now.to_rfc3339_opts(chrono::SecondsFormat::Millis, true)
}

fn offer_key_and_cap(state: &AppState, event: &RawEvent) -> (String, u32) {
    if event.kind == EventKind::BoostOffer {
        let store = state.store.read().expect("store read");
        if let Some(user) = store.get_user(&event.user_id) {
            if let Some(boost) = user.boosts.first() {
                return (boost.id.clone(), boost.weekly_cap);
            }
        }
    }
    (format!("{:?}", event.kind), 5)
}

pub fn process(state: &AppState, event: RawEvent, now: DateTime<Utc>) -> Option<Moment> {
    let user = {
        let store = state.store.read().expect("store read");
        store.get_user(&event.user_id).cloned()
    }?;

    let content_class = classify(event.kind);
    let vertical = event.kind.vertical();
    let intended = intended_surface(event.kind);

    let tone = check_tone(&event.title, &event.body);
    if !tone.ok {
        let reasons = vec![Reason::new(
            ReasonCode::ContentDarkPattern,
            format!("Rejected urgency/pressure language: {}", tone.matched.unwrap_or_default()),
        )];
        record_blocked(state, &event, content_class, reasons, now);
        return None;
    }

    let (offer_key, offer_cap) = offer_key_and_cap(state, &event);
    let offer_cap_reached = if content_class == ContentClass::Inducement {
        let store = state.store.read().expect("store read");
        store.is_offer_cap_reached(&event.user_id, &offer_key, offer_cap)
    } else {
        false
    };

    let ctx = CareGateContext {
        intended_surface: intended,
        hourly_alert_cap_reached: state.hourly_cap_reached(&user.id, now),
        daily_alert_cap_reached: state.daily_cap_reached(&user.id, now),
        offer_cap_reached,
    };

    let decision = evaluate(&user, content_class, &ctx, now);
    if !decision.allowed {
        record_blocked(state, &event, content_class, decision.reasons, now);
        return None;
    }

    let surface = finalise_surface(event.kind, &decision);
    if surface == Surface::Push {
        state.increment_push(&user.id, now);
    }
    if content_class == ContentClass::Inducement {
        let mut store = state.store.write().expect("store write");
        store.record_offer_delivery(&user.id, &offer_key);
    }

    let (data, stripped) = strip_sensitive_financials(&event.data);
    let mut reasons = decision.reasons.clone();
    if stripped {
        reasons.push(Reason::new(
            ReasonCode::FinancialsStripped,
            "Spend/loss data removed. Ambient surfaces show status only.",
        ));
    }

    let mut cta = event.cta.clone();
    if content_class == ContentClass::Informational
        && cta.is_some()
        && event.kind != EventKind::CashoutWindow
    {
        cta = None;
        reasons.push(Reason::new(
            ReasonCode::CtaStripped,
            "Informational continuity only. Promotional CTA removed.",
        ));
    }

    let widget_family = if surface == Surface::Widget {
        widget_family_for(event.kind)
    } else {
        None
    };

    let created_at = now_iso(now);
    let moment = Moment {
        id: id("mom_"),
        user_id: user.id.clone(),
        event_id: event.id.clone(),
        vertical,
        kind: event.kind,
        content_class,
        surface,
        widget_family,
        cta,
        title: event.title.clone(),
        body: event.body.clone(),
        data,
        reasons: reasons.clone(),
        created_at: created_at.clone(),
    };

    state.record_audit(AuditRecord {
        id: id("aud_"),
        user_id: user.id.clone(),
        event_id: event.id.clone(),
        vertical,
        kind: event.kind,
        content_class,
        allowed: true,
        surface: Some(surface),
        widget_family,
        reasons,
        created_at,
    });

    state.hub.publish(&user.id, moment.clone());
    Some(moment)
}

fn record_blocked(
    state: &AppState,
    event: &RawEvent,
    content_class: ContentClass,
    reasons: Vec<Reason>,
    now: DateTime<Utc>,
) {
    state.record_audit(AuditRecord {
        id: id("aud_"),
        user_id: event.user_id.clone(),
        event_id: event.id.clone(),
        vertical: event.kind.vertical(),
        kind: event.kind,
        content_class,
        allowed: false,
        surface: None,
        widget_family: None,
        reasons,
        created_at: now_iso(now),
    });
}
