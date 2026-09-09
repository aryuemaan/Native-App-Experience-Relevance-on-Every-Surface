/**
 * FEG Pulse — domain model.
 *
 * FEG Pulse turns the phone's own surfaces into a live extension of the FEG
 * apps (Fortuna / Casa Pariurilor / PSK): the user's followed teams, their open
 * slip, and their live cash-out value appear on the lock screen, in the Dynamic
 * Island / Live Activity, on the watch and via voice — so a bettor never opens
 * a third-party score app to check something they already have skin in.
 *
 * The vocabulary maps 1:1 to the pitch:
 *   Interest & Activity Graph  → User, Account, follows, Ticket, Boost
 *   Live Event Stream          → RawEvent
 *   content classes            → Informational vs Inducement
 *   the Care Gate              → Decision + reasons (the single compliance kernel)
 *   the Moment Router          → Moment + Surface + WidgetFamily
 */

// ---------------------------------------------------------------- surfaces
/**
 * Delivery surfaces, ordered least → most intrusive. Only `push` is a true
 * interruption; everything above it is silent, glanceable presence the user
 * chose to look at.
 */
export const SURFACE_LADDER = [
  'watch', // complication — ambient, zero-tap
  'widget', // lock / home screen — silent
  'quick_action', // context shortcut (e.g. near a shop) — silent
  'live_activity', // pinned live match + cash-out — silent
  'dynamic_island', // peek on glance — silent
  'push', // interruptive — last resort only
] as const;
export type Surface = (typeof SURFACE_LADDER)[number];

/** The only surface that interrupts. Quiet hours / caps gate this one. */
export const ALERTING_SURFACES: ReadonlySet<Surface> = new Set<Surface>(['push']);

/** Widget families — all personal, none generic. */
export type WidgetFamily = 'slip' | 'teams' | 'boost' | 'games' | 'tournaments' | 'live_dealer';

/** The product vertical a moment belongs to. */
export type Vertical = 'sports' | 'gaming';

// ---------------------------------------------------------------- content
export type ContentClass = 'informational' | 'inducement';

// ------------------------------------------------------------------- graph
export interface Team {
  id: string;
  name: string;
  shortName: string;
  competition: string;
}

export type TicketStatus = 'open' | 'cashout_available' | 'cashed_out' | 'won' | 'lost';

export interface Ticket {
  id: string;
  label: string; // e.g. "Slavia Praha to win"
  stake: number;
  potentialReturn: number;
  odds: number; // price at placement
  liveOdds: number; // current price (drives the odds delta arrow)
  liveValue: number; // current cash-out value — moves during the match
  status: TicketStatus;
  fixtureId: string;
  liveEligible: boolean; // whether it auto-starts a Live Activity
}

export type RewardType = 'free_bet' | 'mission' | 'streak';
export interface Reward {
  id: string;
  type: RewardType;
  label: string;
  progress: number;
  expiresAt: string;
}

/** A "Boosted for You" offer — the inducement class, followers-only + capped. */
export interface Boost {
  id: string;
  teamId: string; // only shown to followers of this team
  market: string;
  label: string;
  baseOdds: number;
  boostedOdds: number;
  weeklyCap: number; // backend-enforced frequency cap
}

export interface Fixture {
  id: string;
  home: string;
  away: string;
  competition: string;
  kickoff: string;
  homeScore: number;
  awayScore: number;
  minute: number;
  live: boolean;
}

// ------------------------------------------------------------------ gaming
export interface Slot {
  id: string;
  name: string;
  provider: string;
  isNew: boolean;
  freeSpins: number;
}

export interface Tournament {
  id: string;
  name: string;
  game: string;
  seatsTotal: number;
  seatsLeft: number;
  startsInMinutes: number;
  buyIn: number;
}

export interface LiveDealerTable {
  id: string;
  name: string;
  game: string;
  minBet: number;
  open: boolean;
}

export interface Bonus {
  id: string;
  label: string;
  kind: string;
}

// ---------------------------------------------------- account / consent / RG
/**
 * KYC / age / market gating. If an account is not verified for its jurisdiction,
 * NO surface may exist for it — enforced at the data layer, not hidden in UI.
 */
export interface Account {
  kycVerified: boolean;
  ageVerified: boolean;
  marketAllowed: boolean; // licensed jurisdiction for this user
  market: string; // CZ / SK / PL / RO / HR
}

/** Granular, per-surface opt-in — not a single master toggle. */
export interface SurfaceConsent {
  liveActivity: boolean;
  widgets: boolean;
  watch: boolean;
  geolocation: boolean;
  voice: boolean;
}

export interface Consent {
  personalisation: boolean; // any personalised surface at all
  marketing: boolean; // gates the inducement class (boosts)
  surfaces: SurfaceConsent; // per-surface granular consent
  tcfString?: string;
  updatedAt: string;
}

export type RiskLevel = 'none' | 'elevated' | 'high';

export interface RGStatus {
  selfExcluded: boolean;
  riskLevel: RiskLevel;
  depositLimitReached: boolean;
  quietHours: { start: string; end: string }; // local "HH:MM"
}

export interface User {
  id: string;
  name: string;
  timezoneOffsetMinutes: number;
  account: Account;
  follows: { teams: string[]; competitions: string[] };
  favoriteSlots?: string[];
  followedTournaments?: string[];
  liveDealerTables?: string[];
  tickets: Ticket[];
  rewards: Reward[];
  boosts: Boost[];
  consent: Consent;
  rg: RGStatus;
}

// ------------------------------------------------------------------- events
export type EventKind =
  // informational — the user's own choices / positions
  | 'fixture_upcoming'
  | 'live_activity_start' // bet placed on a live-eligible market
  | 'score_update'
  | 'odds_move' // cash-out value / odds delta changes
  | 'cashout_window' // cash-out is attractive / available
  | 'ticket_settled'
  | 'reward_expiring'
  | 'geo_shortcut' // context-aware convenience shortcut (consent-gated)
  // inducement — a separate, hard-gated class
  | 'boost_offer'
  // gaming — informational (continuity, RG-safe for everyone)
  | 'slot_release'
  | 'tournament_starting_soon'
  | 'live_dealer_table_open'
  // gaming — inducement (hard-gated for at-risk / self-excluded cohorts)
  | 'slot_promo'
  | 'tournament_seats_low'
  | 'live_dealer_join_offer'
  | 'bonus_drop'
  | 'jackpot_alert';

export interface RawEvent {
  id: string;
  userId: string;
  kind: EventKind;
  vertical?: Vertical;
  title: string;
  body: string;
  cta?: string;
  data: Record<string, unknown>;
  fixtureId?: string;
  priority: 0 | 1 | 2 | 3;
  createdAt: string;
}

// --------------------------------------------------------------- decisions
export type ReasonCode =
  | 'ELIGIBILITY_NOT_VERIFIED' // KYC / age / market
  | 'CONSENT_PERSONALISATION_MISSING'
  | 'CONSENT_SURFACE_OFF' // per-surface opt-in is off
  | 'CONSENT_MARKETING_MISSING'
  | 'RG_SELF_EXCLUDED'
  | 'RG_AT_RISK'
  | 'RG_DEPOSIT_LIMIT_REACHED'
  | 'BOOST_WEEKLY_CAP_REACHED'
  | 'CONTENT_DARK_PATTERN' // urgency / pressure language rejected
  | 'CTA_STRIPPED' // promotional CTA removed for informational continuity
  | 'FINANCIALS_STRIPPED' // spend/loss removed from an ambient surface
  | 'QUIET_HOURS'
  | 'DAILY_ALERT_CAP_REACHED'
  | 'ALLOWED_INFORMATIONAL'
  | 'ALLOWED_MARKETING_CONSENTED'
  | 'DOWNGRADED_TO_SILENT';

export interface Reason {
  code: ReasonCode;
  message: string;
}

export interface Decision {
  allowed: boolean;
  contentClass: ContentClass;
  alertingAllowed: boolean; // may `push` be used?
  reasons: Reason[];
}

export interface Moment {
  id: string;
  userId: string;
  eventId: string;
  kind: EventKind;
  vertical: Vertical;
  contentClass: ContentClass;
  surface: Surface;
  widgetFamily?: WidgetFamily;
  cta?: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  reasons: Reason[];
  createdAt: string;
}

export interface AuditRecord {
  id: string;
  userId: string;
  eventId: string;
  kind: EventKind;
  vertical: Vertical;
  contentClass: ContentClass;
  allowed: boolean;
  surface?: Surface;
  widgetFamily?: WidgetFamily;
  reasons: Reason[];
  createdAt: string;
}
