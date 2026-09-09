use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Surface {
    Watch,
    Widget,
    QuickAction,
    LiveActivity,
    DynamicIsland,
    Push,
}

impl Surface {
    pub fn ladder() -> [Surface; 6] {
        [
            Surface::Watch,
            Surface::Widget,
            Surface::QuickAction,
            Surface::LiveActivity,
            Surface::DynamicIsland,
            Surface::Push,
        ]
    }

    pub fn is_alerting(self) -> bool {
        matches!(self, Surface::Push)
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Vertical {
    Sports,
    Gaming,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ContentClass {
    Informational,
    Inducement,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum WidgetFamily {
    Slip,
    Teams,
    Boost,
    Games,
    Tournaments,
    LiveDealer,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum EventKind {
    FixtureUpcoming,
    LiveActivityStart,
    ScoreUpdate,
    OddsMove,
    CashoutWindow,
    TicketSettled,
    RewardExpiring,
    GeoShortcut,
    BoostOffer,
    SlotRelease,
    SlotPromo,
    TournamentStartingSoon,
    TournamentSeatsLow,
    LiveDealerTableOpen,
    LiveDealerJoinOffer,
    BonusDrop,
    JackpotAlert,
}

impl EventKind {
    pub fn vertical(self) -> Vertical {
        use EventKind::*;
        match self {
            SlotRelease | SlotPromo | TournamentStartingSoon | TournamentSeatsLow
            | LiveDealerTableOpen | LiveDealerJoinOffer | BonusDrop | JackpotAlert => Vertical::Gaming,
            _ => Vertical::Sports,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ReasonCode {
    EligibilityNotVerified,
    ConsentPersonalisationMissing,
    ConsentSurfaceOff,
    ConsentMarketingMissing,
    ConsentTcfPurposeMissing,
    RgSelfExcluded,
    RgAtRisk,
    RgDepositLimitReached,
    OfferFrequencyCapReached,
    AllowedMarketingConsented,
    AllowedInformational,
    QuietHours,
    HourlyAlertCapReached,
    DailyAlertCapReached,
    DowngradedToSilent,
    FinancialsStripped,
    ContentDarkPattern,
    CtaStripped,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Reason {
    pub code: ReasonCode,
    pub message: String,
}

impl Reason {
    pub fn new(code: ReasonCode, message: impl Into<String>) -> Self {
        Reason { code, message: message.into() }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Team {
    pub id: String,
    pub name: String,
    pub short_name: String,
    pub competition: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TicketStatus {
    Open,
    CashoutAvailable,
    CashedOut,
    Won,
    Lost,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Ticket {
    pub id: String,
    pub label: String,
    pub stake: f64,
    pub potential_return: f64,
    pub odds: f64,
    pub live_odds: f64,
    pub live_value: f64,
    pub status: TicketStatus,
    pub fixture_id: String,
    pub live_eligible: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Reward {
    pub id: String,
    pub label: String,
    pub progress: f64,
    pub expires_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Boost {
    pub id: String,
    pub team_id: String,
    pub market: String,
    pub label: String,
    pub base_odds: f64,
    pub boosted_odds: f64,
    pub weekly_cap: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Fixture {
    pub id: String,
    pub home: String,
    pub away: String,
    pub competition: String,
    pub kickoff: String,
    pub home_score: u32,
    pub away_score: u32,
    pub minute: u32,
    pub live: bool,
    pub odds_home: f64,
    pub odds_draw: f64,
    pub odds_away: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Slot {
    pub id: String,
    pub name: String,
    pub provider: String,
    pub is_new: bool,
    pub free_spins: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Tournament {
    pub id: String,
    pub name: String,
    pub game: String,
    pub seats_total: u32,
    pub seats_left: u32,
    pub starts_in_minutes: u32,
    pub buy_in: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LiveDealerTable {
    pub id: String,
    pub name: String,
    pub game: String,
    pub min_bet: f64,
    pub open: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Bonus {
    pub id: String,
    pub label: String,
    pub kind: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Account {
    pub kyc_verified: bool,
    pub age_verified: bool,
    pub market_allowed: bool,
    pub market: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SurfaceConsent {
    pub live_activity: bool,
    pub widgets: bool,
    pub watch: bool,
    pub geolocation: bool,
    pub voice: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Consent {
    pub personalisation: bool,
    pub marketing: bool,
    pub tcf_version: String,
    pub tcf_purpose_consent: bool,
    pub surfaces: SurfaceConsent,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RiskLevel {
    Low,
    Medium,
    High,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QuietHours {
    pub start: String,
    pub end: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RgStatus {
    pub self_excluded: bool,
    pub deposit_limit_reached: bool,
    pub risk_level: RiskLevel,
    pub quiet_hours: QuietHours,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct User {
    pub id: String,
    pub display_name: String,
    pub market: String,
    pub timezone_offset_minutes: i64,
    pub account: Account,
    pub consent: Consent,
    pub rg: RgStatus,
    pub follows: Vec<String>,
    pub tickets: Vec<Ticket>,
    pub rewards: Vec<Reward>,
    pub boosts: Vec<Boost>,
    pub favorite_slots: Vec<String>,
    pub followed_tournaments: Vec<String>,
    pub live_dealer_tables: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RawEvent {
    pub id: String,
    pub user_id: String,
    pub kind: EventKind,
    pub title: String,
    pub body: String,
    #[serde(default)]
    pub cta: Option<String>,
    #[serde(default)]
    pub data: Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Decision {
    pub allowed: bool,
    pub content_class: ContentClass,
    pub alerting_allowed: bool,
    pub reasons: Vec<Reason>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Moment {
    pub id: String,
    pub user_id: String,
    pub event_id: String,
    pub vertical: Vertical,
    pub kind: EventKind,
    pub content_class: ContentClass,
    pub surface: Surface,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub widget_family: Option<WidgetFamily>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cta: Option<String>,
    pub title: String,
    pub body: String,
    pub data: Value,
    pub reasons: Vec<Reason>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AuditRecord {
    pub id: String,
    pub user_id: String,
    pub event_id: String,
    pub vertical: Vertical,
    pub kind: EventKind,
    pub content_class: ContentClass,
    pub allowed: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub surface: Option<Surface>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub widget_family: Option<WidgetFamily>,
    pub reasons: Vec<Reason>,
    pub created_at: String,
}

#[derive(Debug, Clone)]
pub struct CareGateContext {
    pub intended_surface: Surface,
    pub hourly_alert_cap_reached: bool,
    pub daily_alert_cap_reached: bool,
    pub offer_cap_reached: bool,
}
