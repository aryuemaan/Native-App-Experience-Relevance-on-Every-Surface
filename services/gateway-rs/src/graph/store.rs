use indexmap::IndexMap;
use serde::Deserialize;
use std::collections::HashMap;

use crate::domain::types::{
    Bonus, Fixture, LiveDealerTable, RiskLevel, Slot, Team, Ticket, TicketStatus, Tournament, User,
};

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SurfacePatch {
    pub live_activity: Option<bool>,
    pub widgets: Option<bool>,
    pub watch: Option<bool>,
    pub geolocation: Option<bool>,
    pub voice: Option<bool>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConsentPatch {
    pub personalisation: Option<bool>,
    pub marketing: Option<bool>,
    pub tcf_purpose_consent: Option<bool>,
    pub surfaces: Option<SurfacePatch>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RgPatch {
    pub self_excluded: Option<bool>,
    pub deposit_limit_reached: Option<bool>,
    pub risk_level: Option<RiskLevel>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AccountPatch {
    pub kyc_verified: Option<bool>,
    pub age_verified: Option<bool>,
    pub market_allowed: Option<bool>,
    pub market: Option<String>,
}

pub struct Store {
    pub users: IndexMap<String, User>,
    pub teams: IndexMap<String, Team>,
    pub fixtures: IndexMap<String, Fixture>,
    pub slots: IndexMap<String, Slot>,
    pub tournaments: IndexMap<String, Tournament>,
    pub tables: IndexMap<String, LiveDealerTable>,
    pub bonuses: IndexMap<String, Bonus>,
    offer_deliveries: HashMap<String, u32>,
}

impl Store {
    pub fn new() -> Self {
        Store {
            users: IndexMap::new(),
            teams: IndexMap::new(),
            fixtures: IndexMap::new(),
            slots: IndexMap::new(),
            tournaments: IndexMap::new(),
            tables: IndexMap::new(),
            bonuses: IndexMap::new(),
            offer_deliveries: HashMap::new(),
        }
    }

    pub fn get_user(&self, user_id: &str) -> Option<&User> {
        self.users.get(user_id)
    }

    pub fn get_user_mut(&mut self, user_id: &str) -> Option<&mut User> {
        self.users.get_mut(user_id)
    }

    pub fn cashout(&mut self, user_id: &str, ticket_id: &str) -> Option<Ticket> {
        let user = self.users.get_mut(user_id)?;
        for ticket in user.tickets.iter_mut() {
            if ticket.id == ticket_id {
                ticket.status = TicketStatus::CashedOut;
                return Some(ticket.clone());
            }
        }
        None
    }

    pub fn open_ticket(&self, user_id: &str) -> Option<Ticket> {
        let user = self.users.get(user_id)?;
        user.tickets
            .iter()
            .find(|t| {
                matches!(t.status, TicketStatus::Open | TicketStatus::CashoutAvailable)
            })
            .cloned()
            .or_else(|| user.tickets.first().cloned())
    }

    pub fn repeat_bet_allowed(&self, user_id: &str) -> bool {
        match self.users.get(user_id) {
            Some(u) => {
                !u.rg.self_excluded
                    && !u.rg.deposit_limit_reached
                    && u.rg.risk_level != RiskLevel::High
            }
            None => false,
        }
    }

    pub fn update_consent(&mut self, user_id: &str, patch: ConsentPatch) -> bool {
        let Some(user) = self.users.get_mut(user_id) else { return false };
        if let Some(v) = patch.personalisation {
            user.consent.personalisation = v;
        }
        if let Some(v) = patch.marketing {
            user.consent.marketing = v;
        }
        if let Some(v) = patch.tcf_purpose_consent {
            user.consent.tcf_purpose_consent = v;
        }
        if let Some(s) = patch.surfaces {
            if let Some(v) = s.live_activity {
                user.consent.surfaces.live_activity = v;
            }
            if let Some(v) = s.widgets {
                user.consent.surfaces.widgets = v;
            }
            if let Some(v) = s.watch {
                user.consent.surfaces.watch = v;
            }
            if let Some(v) = s.geolocation {
                user.consent.surfaces.geolocation = v;
            }
            if let Some(v) = s.voice {
                user.consent.surfaces.voice = v;
            }
        }
        true
    }

    pub fn update_rg(&mut self, user_id: &str, patch: RgPatch) -> bool {
        let Some(user) = self.users.get_mut(user_id) else { return false };
        if let Some(v) = patch.self_excluded {
            user.rg.self_excluded = v;
        }
        if let Some(v) = patch.deposit_limit_reached {
            user.rg.deposit_limit_reached = v;
        }
        if let Some(v) = patch.risk_level {
            user.rg.risk_level = v;
        }
        true
    }

    pub fn update_account(&mut self, user_id: &str, patch: AccountPatch) -> bool {
        let Some(user) = self.users.get_mut(user_id) else { return false };
        if let Some(v) = patch.kyc_verified {
            user.account.kyc_verified = v;
        }
        if let Some(v) = patch.age_verified {
            user.account.age_verified = v;
        }
        if let Some(v) = patch.market_allowed {
            user.account.market_allowed = v;
        }
        if let Some(v) = patch.market {
            user.account.market = v;
        }
        true
    }

    pub fn is_offer_cap_reached(&self, user_id: &str, offer_id: &str, weekly_cap: u32) -> bool {
        let key = format!("{}:{}", user_id, offer_id);
        self.offer_deliveries.get(&key).copied().unwrap_or(0) >= weekly_cap
    }

    pub fn record_offer_delivery(&mut self, user_id: &str, offer_id: &str) {
        let key = format!("{}:{}", user_id, offer_id);
        *self.offer_deliveries.entry(key).or_insert(0) += 1;
    }
}

impl Default for Store {
    fn default() -> Self {
        Store::new()
    }
}
