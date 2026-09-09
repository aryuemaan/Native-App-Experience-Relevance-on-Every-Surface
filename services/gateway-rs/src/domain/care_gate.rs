use chrono::{DateTime, Duration, Timelike, Utc};

use super::types::{
    CareGateContext, ContentClass, Decision, Reason, ReasonCode, RiskLevel, Surface, User,
};

fn parse_hm(value: &str) -> i64 {
    let mut parts = value.split(':');
    let h: i64 = parts.next().and_then(|v| v.parse().ok()).unwrap_or(0);
    let m: i64 = parts.next().and_then(|v| v.parse().ok()).unwrap_or(0);
    h * 60 + m
}

pub fn is_within_quiet_hours(user: &User, now: DateTime<Utc>) -> bool {
    let local = now + Duration::minutes(user.timezone_offset_minutes);
    let minutes = (local.hour() * 60 + local.minute()) as i64;
    let start = parse_hm(&user.rg.quiet_hours.start);
    let end = parse_hm(&user.rg.quiet_hours.end);
    if start == end {
        return false;
    }
    if start < end {
        minutes >= start && minutes < end
    } else {
        minutes >= start || minutes < end
    }
}

fn surface_consent_ok(user: &User, surface: Surface) -> bool {
    let s = &user.consent.surfaces;
    match surface {
        Surface::LiveActivity | Surface::DynamicIsland => s.live_activity,
        Surface::Widget => s.widgets,
        Surface::Watch => s.watch,
        Surface::QuickAction => s.geolocation,
        Surface::Push => true,
    }
}

pub fn evaluate(
    user: &User,
    content_class: ContentClass,
    ctx: &CareGateContext,
    now: DateTime<Utc>,
) -> Decision {
    let mut reasons: Vec<Reason> = Vec::new();

    let a = &user.account;
    if !a.kyc_verified || !a.age_verified || !a.market_allowed {
        reasons.push(Reason::new(
            ReasonCode::EligibilityNotVerified,
            "Account not KYC/age/market verified. No surface exists.",
        ));
        return Decision { allowed: false, content_class, alerting_allowed: false, reasons };
    }

    if !user.consent.personalisation {
        reasons.push(Reason::new(
            ReasonCode::ConsentPersonalisationMissing,
            "No personalisation consent. Nothing renders.",
        ));
        return Decision { allowed: false, content_class, alerting_allowed: false, reasons };
    }

    if !user.consent.tcf_purpose_consent {
        reasons.push(Reason::new(
            ReasonCode::ConsentTcfPurposeMissing,
            "IAB TCF v2.2 purpose consent absent. Personalised surfaces disabled.",
        ));
        return Decision { allowed: false, content_class, alerting_allowed: false, reasons };
    }

    if !surface_consent_ok(user, ctx.intended_surface) {
        reasons.push(Reason::new(
            ReasonCode::ConsentSurfaceOff,
            "The intended surface is switched off by the user.",
        ));
        return Decision { allowed: false, content_class, alerting_allowed: false, reasons };
    }

    if content_class == ContentClass::Inducement {
        if !user.consent.marketing {
            reasons.push(Reason::new(
                ReasonCode::ConsentMarketingMissing,
                "Marketing consent not granted. Inducement blocked.",
            ));
        }
        if user.rg.self_excluded {
            reasons.push(Reason::new(
                ReasonCode::RgSelfExcluded,
                "User is self-excluded. Inducement blocked by construction.",
            ));
        }
        if user.rg.risk_level == RiskLevel::High {
            reasons.push(Reason::new(
                ReasonCode::RgAtRisk,
                "User flagged high-risk. Inducement blocked by construction.",
            ));
        }
        if user.rg.deposit_limit_reached {
            reasons.push(Reason::new(
                ReasonCode::RgDepositLimitReached,
                "Deposit/spend limit reached. Inducement blocked.",
            ));
        }
        if ctx.offer_cap_reached {
            reasons.push(Reason::new(
                ReasonCode::OfferFrequencyCapReached,
                "Offer frequency cap reached. Blocked.",
            ));
        }
        if !reasons.is_empty() {
            return Decision { allowed: false, content_class, alerting_allowed: false, reasons };
        }
        reasons.push(Reason::new(
            ReasonCode::AllowedMarketingConsented,
            "Marketing consented, RG-clear and within cap. Inducement permitted.",
        ));
    } else {
        reasons.push(Reason::new(
            ReasonCode::AllowedInformational,
            "Informational content the user already follows or holds.",
        ));
    }

    let mut alerting_allowed = true;
    if is_within_quiet_hours(user, now) {
        alerting_allowed = false;
        reasons.push(Reason::new(
            ReasonCode::QuietHours,
            "Inside quiet hours. No interruptive push.",
        ));
    }
    if ctx.hourly_alert_cap_reached {
        alerting_allowed = false;
        reasons.push(Reason::new(
            ReasonCode::HourlyAlertCapReached,
            "Hourly push cap reached. No further pushes this hour.",
        ));
    }
    if ctx.daily_alert_cap_reached {
        alerting_allowed = false;
        reasons.push(Reason::new(
            ReasonCode::DailyAlertCapReached,
            "Daily push cap reached. No further pushes today.",
        ));
    }
    if !alerting_allowed && ctx.intended_surface == Surface::Push {
        reasons.push(Reason::new(
            ReasonCode::DowngradedToSilent,
            "Delivered on a silent, ambient surface instead.",
        ));
    }

    Decision { allowed: true, content_class, alerting_allowed, reasons }
}
