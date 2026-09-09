use crate::domain::types::*;
use crate::graph::store::Store;

fn team(id: &str, name: &str, short: &str) -> Team {
    Team {
        id: id.to_string(),
        name: name.to_string(),
        short_name: short.to_string(),
        competition: "SuperSport HNL".to_string(),
    }
}

fn consent(marketing: bool) -> Consent {
    Consent {
        personalisation: true,
        marketing,
        tcf_version: "2.2".to_string(),
        tcf_purpose_consent: true,
        surfaces: SurfaceConsent {
            live_activity: true,
            widgets: true,
            watch: true,
            geolocation: true,
            voice: true,
        },
    }
}

fn quiet() -> QuietHours {
    QuietHours { start: "03:00".to_string(), end: "06:00".to_string() }
}

fn account(kyc: bool) -> Account {
    Account { kyc_verified: kyc, age_verified: true, market_allowed: true, market: "HR".to_string() }
}

pub fn build_store() -> Store {
    let mut store = Store::new();

    for t in [
        team("dinamo", "GNK Dinamo", "DIN"),
        team("hajduk", "HNK Hajduk", "HAJ"),
        team("rijeka", "HNK Rijeka", "RIJ"),
        team("osijek", "NK Osijek", "OSI"),
    ] {
        store.teams.insert(t.id.clone(), t);
    }

    let fixtures = vec![
        Fixture {
            id: "fx_dinamo_hajduk".to_string(),
            home: "GNK Dinamo".to_string(),
            away: "HNK Hajduk".to_string(),
            competition: "SuperSport HNL".to_string(),
            kickoff: "2026-09-09T19:00:00Z".to_string(),
            home_score: 0,
            away_score: 0,
            minute: 0,
            live: false,
            odds_home: 2.10,
            odds_draw: 3.30,
            odds_away: 3.40,
        },
        Fixture {
            id: "fx_rijeka_osijek".to_string(),
            home: "HNK Rijeka".to_string(),
            away: "NK Osijek".to_string(),
            competition: "SuperSport HNL".to_string(),
            kickoff: "2026-09-09T17:00:00Z".to_string(),
            home_score: 1,
            away_score: 1,
            minute: 57,
            live: true,
            odds_home: 1.95,
            odds_draw: 3.40,
            odds_away: 3.90,
        },
        Fixture {
            id: "fx_osijek_dinamo".to_string(),
            home: "NK Osijek".to_string(),
            away: "GNK Dinamo".to_string(),
            competition: "SuperSport HNL".to_string(),
            kickoff: "2026-09-13T18:30:00Z".to_string(),
            home_score: 0,
            away_score: 0,
            minute: 0,
            live: false,
            odds_home: 4.20,
            odds_draw: 3.60,
            odds_away: 1.80,
        },
    ];
    for f in fixtures {
        store.fixtures.insert(f.id.clone(), f);
    }

    let slots = vec![
        Slot { id: "slot_bonanza".to_string(), name: "Sweet Bonanza".to_string(), provider: "Pragmatic Play".to_string(), is_new: false, free_spins: 0 },
        Slot { id: "slot_gates".to_string(), name: "Gates of Olympus".to_string(), provider: "Pragmatic Play".to_string(), is_new: false, free_spins: 0 },
        Slot { id: "slot_wanted".to_string(), name: "Wanted Dead or a Wild".to_string(), provider: "Hacksaw Gaming".to_string(), is_new: true, free_spins: 3 },
        Slot { id: "slot_bigbass".to_string(), name: "Big Bass Bonanza".to_string(), provider: "Pragmatic Play".to_string(), is_new: false, free_spins: 0 },
    ];
    for s in slots {
        store.slots.insert(s.id.clone(), s);
    }

    let tournaments = vec![
        Tournament { id: "tourn_daily_kok".to_string(), name: "Daily Kokice Cup".to_string(), game: "Sweet Bonanza".to_string(), seats_total: 128, seats_left: 12, starts_in_minutes: 8, buy_in: 5.0 },
        Tournament { id: "tourn_weekend".to_string(), name: "Weekend Jackpot Klasik".to_string(), game: "Gates of Olympus".to_string(), seats_total: 256, seats_left: 80, starts_in_minutes: 120, buy_in: 10.0 },
    ];
    for t in tournaments {
        store.tournaments.insert(t.id.clone(), t);
    }

    let tables = vec![
        LiveDealerTable { id: "table_hr_roulette".to_string(), name: "Hrvatski Auto Rulet".to_string(), game: "Roulette".to_string(), min_bet: 5.0, open: true },
        LiveDealerTable { id: "table_bj_vip".to_string(), name: "Blackjack VIP".to_string(), game: "Blackjack".to_string(), min_bet: 25.0, open: false },
    ];
    for t in tables {
        store.tables.insert(t.id.clone(), t);
    }

    let bonuses = vec![
        Bonus { id: "bonus_welcome".to_string(), label: "Dobrodosli bonus".to_string(), kind: "welcome".to_string() },
        Bonus { id: "bonus_reload".to_string(), label: "Reload petak".to_string(), kind: "reload".to_string() },
    ];
    for b in bonuses {
        store.bonuses.insert(b.id.clone(), b);
    }

    let marek = User {
        id: "marek".to_string(),
        display_name: "Marek".to_string(),
        market: "HR".to_string(),
        timezone_offset_minutes: 120,
        account: account(true),
        consent: consent(true),
        rg: RgStatus { self_excluded: false, deposit_limit_reached: false, risk_level: RiskLevel::Low, quiet_hours: quiet() },
        follows: vec!["dinamo".to_string()],
        tickets: vec![Ticket {
            id: "tkt_marek_dinamo".to_string(),
            label: "GNK Dinamo to win vs Hajduk".to_string(),
            stake: 20.0,
            potential_return: 42.0,
            odds: 2.10,
            live_odds: 2.10,
            live_value: 14.20,
            status: TicketStatus::Open,
            fixture_id: "fx_dinamo_hajduk".to_string(),
            live_eligible: true,
        }],
        rewards: vec![Reward { id: "rw_marek_freebet".to_string(), label: "Free bet 5 EUR".to_string(), progress: 0.6, expires_at: "2026-09-11T20:00:00Z".to_string() }],
        boosts: vec![Boost { id: "bst_dinamo_btts".to_string(), team_id: "dinamo".to_string(), market: "BTTS".to_string(), label: "Oba tima daju gol".to_string(), base_odds: 1.80, boosted_odds: 2.20, weekly_cap: 3 }],
        favorite_slots: vec!["slot_bonanza".to_string(), "slot_wanted".to_string()],
        followed_tournaments: vec!["tourn_daily_kok".to_string()],
        live_dealer_tables: vec!["table_hr_roulette".to_string()],
    };

    let tomas = User {
        id: "tomas".to_string(),
        display_name: "Tomáš".to_string(),
        market: "HR".to_string(),
        timezone_offset_minutes: 120,
        account: account(true),
        consent: consent(true),
        rg: RgStatus { self_excluded: false, deposit_limit_reached: true, risk_level: RiskLevel::Medium, quiet_hours: quiet() },
        follows: vec!["hajduk".to_string()],
        tickets: vec![Ticket {
            id: "tkt_tomas_hajduk".to_string(),
            label: "HNK Hajduk to win vs Dinamo".to_string(),
            stake: 15.0,
            potential_return: 51.0,
            odds: 3.40,
            live_odds: 3.40,
            live_value: 9.10,
            status: TicketStatus::Open,
            fixture_id: "fx_dinamo_hajduk".to_string(),
            live_eligible: true,
        }],
        rewards: vec![],
        boosts: vec![Boost { id: "bst_hajduk_win".to_string(), team_id: "hajduk".to_string(), market: "1X2".to_string(), label: "Hajduk pobjeda".to_string(), base_odds: 3.40, boosted_odds: 4.00, weekly_cap: 3 }],
        favorite_slots: vec!["slot_gates".to_string()],
        followed_tournaments: vec!["tourn_daily_kok".to_string()],
        live_dealer_tables: vec![],
    };

    let eva = User {
        id: "eva".to_string(),
        display_name: "Eva".to_string(),
        market: "HR".to_string(),
        timezone_offset_minutes: 120,
        account: account(true),
        consent: consent(false),
        rg: RgStatus { self_excluded: true, deposit_limit_reached: false, risk_level: RiskLevel::High, quiet_hours: quiet() },
        follows: vec!["rijeka".to_string()],
        tickets: vec![Ticket {
            id: "tkt_eva_rijeka".to_string(),
            label: "HNK Rijeka over 1.5 goals".to_string(),
            stake: 10.0,
            potential_return: 18.0,
            odds: 1.80,
            live_odds: 1.55,
            live_value: 12.60,
            status: TicketStatus::Open,
            fixture_id: "fx_rijeka_osijek".to_string(),
            live_eligible: true,
        }],
        rewards: vec![],
        boosts: vec![Boost { id: "bst_rijeka_win".to_string(), team_id: "rijeka".to_string(), market: "1X2".to_string(), label: "Rijeka pobjeda".to_string(), base_odds: 1.95, boosted_odds: 2.30, weekly_cap: 3 }],
        favorite_slots: vec!["slot_bonanza".to_string()],
        followed_tournaments: vec!["tourn_weekend".to_string()],
        live_dealer_tables: vec!["table_hr_roulette".to_string()],
    };

    let jakub = User {
        id: "jakub".to_string(),
        display_name: "Jakub".to_string(),
        market: "HR".to_string(),
        timezone_offset_minutes: 120,
        account: account(false),
        consent: consent(true),
        rg: RgStatus { self_excluded: false, deposit_limit_reached: false, risk_level: RiskLevel::Low, quiet_hours: quiet() },
        follows: vec!["osijek".to_string()],
        tickets: vec![],
        rewards: vec![],
        boosts: vec![],
        favorite_slots: vec![],
        followed_tournaments: vec![],
        live_dealer_tables: vec![],
    };

    for u in [marek, tomas, eva, jakub] {
        store.users.insert(u.id.clone(), u);
    }

    store
}
