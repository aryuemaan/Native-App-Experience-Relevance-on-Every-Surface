use serde_json::json;
use uuid::Uuid;

use crate::domain::types::{EventKind, RawEvent, User};

pub struct ScenarioStep {
    pub event: RawEvent,
    pub delay_ms: u64,
}

fn new_id(prefix: &str) -> String {
    format!("{}{}", prefix, Uuid::new_v4().simple())
}

fn event(
    user: &User,
    kind: EventKind,
    title: &str,
    body: &str,
    cta: Option<&str>,
    data: serde_json::Value,
) -> RawEvent {
    RawEvent {
        id: new_id("evt_"),
        user_id: user.id.clone(),
        kind,
        title: title.to_string(),
        body: body.to_string(),
        cta: cta.map(|s| s.to_string()),
        data,
    }
}

pub fn derby(user: &User) -> Vec<ScenarioStep> {
    vec![
        ScenarioStep {
            event: event(
                user,
                EventKind::FixtureUpcoming,
                "Vjecni derbi",
                "GNK Dinamo vs HNK Hajduk pocinje uskoro",
                None,
                json!({"fixtureId":"fx_dinamo_hajduk","home":"GNK Dinamo","away":"HNK Hajduk","kickoff":"19:00"}),
            ),
            delay_ms: 0,
        },
        ScenarioStep {
            event: event(
                user,
                EventKind::LiveActivityStart,
                "Uzivo: Dinamo vs Hajduk",
                "0:0 - prvo poluvrijeme",
                None,
                json!({"fixtureId":"fx_dinamo_hajduk","homeScore":0,"awayScore":0,"minute":1,"liveValue":14.20,"liveOdds":2.10}),
            ),
            delay_ms: 700,
        },
        ScenarioStep {
            event: event(
                user,
                EventKind::ScoreUpdate,
                "GOL! GNK Dinamo",
                "Baturina 23' - Dinamo vodi 1:0",
                None,
                json!({"fixtureId":"fx_dinamo_hajduk","homeScore":1,"awayScore":0,"minute":23,"scorer":"Baturina","liveValue":18.90,"liveOdds":1.62,"oddsDelta":-0.48}),
            ),
            delay_ms: 900,
        },
        ScenarioStep {
            event: event(
                user,
                EventKind::OddsMove,
                "Tečaj se pomaknuo",
                "Dinamo pobjeda 1.62",
                None,
                json!({"fixtureId":"fx_dinamo_hajduk","liveOdds":1.62,"oddsDelta":-0.48}),
            ),
            delay_ms: 700,
        },
        ScenarioStep {
            event: event(
                user,
                EventKind::CashoutWindow,
                "Isplata dostupna",
                "Isplati sada 18,90 EUR",
                Some("Isplati"),
                json!({"ticketId":"tkt_marek_dinamo","cashoutValue":18.90,"stake":20.0}),
            ),
            delay_ms: 800,
        },
        ScenarioStep {
            event: event(
                user,
                EventKind::GeoShortcut,
                "Blizu si PSK poslovnice",
                "Provjeri listic ili gledaj utakmicu",
                None,
                json!({"venue":"PSK Zagreb Centar","derivedProximity":"near_shop"}),
            ),
            delay_ms: 900,
        },
    ]
}

pub fn gaming_slot(user: &User) -> Vec<ScenarioStep> {
    vec![
        ScenarioStep {
            event: event(
                user,
                EventKind::SlotRelease,
                "Nova igra dodana",
                "Wanted Dead or a Wild - Hacksaw Gaming",
                None,
                json!({"slotId":"slot_wanted","provider":"Hacksaw Gaming"}),
            ),
            delay_ms: 0,
        },
        ScenarioStep {
            event: event(
                user,
                EventKind::SlotPromo,
                "Wanted Dead or a Wild",
                "3 besplatna vrtnja spremna za tebe",
                Some("Zavrti"),
                json!({"slotId":"slot_wanted","freeSpins":3}),
            ),
            delay_ms: 700,
        },
    ]
}

pub fn gaming_tournament(user: &User) -> Vec<ScenarioStep> {
    vec![
        ScenarioStep {
            event: event(
                user,
                EventKind::TournamentStartingSoon,
                "Daily Kokice Cup",
                "Pocinje za 8 minuta",
                None,
                json!({"tournamentId":"tourn_daily_kok","startsInMinutes":8,"seatsLeft":12}),
            ),
            delay_ms: 0,
        },
        ScenarioStep {
            event: event(
                user,
                EventKind::TournamentSeatsLow,
                "Daily Kokice Cup",
                "Jos 12 mjesta - rezerviraj svoje",
                Some("Rezerviraj mjesto"),
                json!({"tournamentId":"tourn_daily_kok","seatsLeft":12,"seatsTotal":128,"buyIn":5.0}),
            ),
            delay_ms: 800,
        },
    ]
}

pub fn gaming_live_dealer(user: &User) -> Vec<ScenarioStep> {
    vec![
        ScenarioStep {
            event: event(
                user,
                EventKind::LiveDealerTableOpen,
                "Hrvatski Auto Rulet",
                "Stol je slobodan - min ulog 5 EUR",
                None,
                json!({"tableId":"table_hr_roulette","minBet":5.0}),
            ),
            delay_ms: 0,
        },
        ScenarioStep {
            event: event(
                user,
                EventKind::LiveDealerJoinOffer,
                "Hrvatski Auto Rulet",
                "Sjedni za stol",
                Some("Udi"),
                json!({"tableId":"table_hr_roulette","minBet":5.0}),
            ),
            delay_ms: 700,
        },
    ]
}

pub fn boost_event(user: &User) -> RawEvent {
    let (label, boosted, base) = user
        .boosts
        .first()
        .map(|b| (b.label.clone(), b.boosted_odds, b.base_odds))
        .unwrap_or_else(|| ("Boost".to_string(), 2.0, 1.8));
    event(
        user,
        EventKind::BoostOffer,
        "Boost za tebe",
        &label,
        Some("Dodaj na listic"),
        json!({"label":label,"boostedOdds":boosted,"baseOdds":base}),
    )
}

pub fn bonus_drop(user: &User) -> RawEvent {
    event(
        user,
        EventKind::BonusDrop,
        "Bonus za tebe",
        "Reload petak aktivan",
        Some("Preuzmi"),
        json!({"bonusId":"bonus_reload"}),
    )
}

pub fn pushy_promo(user: &User) -> RawEvent {
    event(
        user,
        EventKind::BoostOffer,
        "ZADNJA PRILIKA!!!",
        "Ne propusti - deposit now i vrati sve nazad",
        Some("Uplati odmah"),
        json!({"promo":"aggressive"}),
    )
}
