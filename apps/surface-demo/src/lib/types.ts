export type Surface =
  | 'watch' | 'widget' | 'quick_action' | 'live_activity' | 'dynamic_island' | 'push';
export type ContentClass = 'informational' | 'inducement';
export type Vertical = 'sports' | 'gaming';
export type WidgetFamily = 'slip' | 'teams' | 'boost' | 'games' | 'tournaments' | 'live_dealer';
export type EventKind =
  | 'fixture_upcoming' | 'live_activity_start' | 'score_update' | 'odds_move'
  | 'cashout_window' | 'ticket_settled' | 'reward_expiring' | 'geo_shortcut' | 'boost_offer'
  | 'slot_release' | 'slot_promo' | 'tournament_starting_soon' | 'tournament_seats_low'
  | 'live_dealer_table_open' | 'live_dealer_join_offer' | 'bonus_drop' | 'jackpot_alert';

export interface Reason { code: string; message: string; }

export interface Moment {
  id: string; userId: string; eventId: string; kind: EventKind;
  vertical?: Vertical; contentClass: ContentClass; surface: Surface; widgetFamily?: WidgetFamily;
  cta?: string; title: string; body: string; data: Record<string, unknown>;
  reasons: Reason[]; createdAt: string;
}

export interface AuditRecord {
  id: string; userId: string; kind: EventKind; vertical?: Vertical; contentClass: ContentClass;
  allowed: boolean; surface?: Surface; widgetFamily?: WidgetFamily;
  reasons: Reason[]; createdAt: string;
}

export interface SurfaceConsent {
  liveActivity: boolean; widgets: boolean; watch: boolean; geolocation: boolean; voice: boolean;
}
export interface Consent {
  personalisation: boolean; marketing: boolean; surfaces: SurfaceConsent; updatedAt: string;
}
export interface RGStatus {
  selfExcluded: boolean; riskLevel: 'none' | 'elevated' | 'high';
  depositLimitReached: boolean; quietHours: { start: string; end: string };
}
export interface Account {
  kycVerified: boolean; ageVerified: boolean; marketAllowed: boolean; market: string;
}
export interface Ticket {
  id: string; label: string; stake: number; potentialReturn: number;
  odds: number; liveOdds: number; liveValue: number; status: string; liveEligible: boolean;
}
export interface Boost {
  id: string; teamId: string; market: string; label: string;
  baseOdds: number; boostedOdds: number; weeklyCap: number;
}
export interface Slot { id: string; name: string; provider: string; isNew: boolean; freeSpins: number; }
export interface Tournament {
  id: string; name: string; game: string; seatsTotal: number; seatsLeft: number;
  startsInMinutes: number; buyIn: number;
}
export interface LiveDealerTable { id: string; name: string; game: string; minBet: number; open: boolean; }
export interface GamingCatalog {
  slots: Slot[]; tournaments: Tournament[]; tables: LiveDealerTable[];
  bonuses: { id: string; label: string; kind: string }[];
}
export interface UserGraph {
  id: string; name: string; account: Account;
  follows: { teams: string[]; competitions: string[] };
  favoriteSlots?: string[]; followedTournaments?: string[]; liveDealerTables?: string[];
  tickets: Ticket[]; rewards: { id: string; label: string }[];
  boosts: Boost[]; consent: Consent; rg: RGStatus;
}
