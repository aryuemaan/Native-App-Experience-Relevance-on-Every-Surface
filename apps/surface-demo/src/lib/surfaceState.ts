import type { Moment, Reason } from './types';

export interface FixtureView {
  home: string; away: string; homeScore: number; awayScore: number;
  minute: number; settled: boolean;
}
export interface TicketView {
  label: string; liveValue: number; status: string;
  direction: 'up' | 'down' | 'flat';
}
export interface CardView { title: string; body: string; reasons: Reason[]; }
export interface PushView { title: string; body: string; at: number; }

export interface GamesView {
  title: string; body: string; provider?: string; freeSpins?: number;
  cta?: string; reasons: Reason[];
}
export interface TournamentView {
  name: string; body: string; seatsLeft?: number; seatsTotal?: number;
  startsInMinutes?: number; cta?: string; reasons: Reason[];
}
export interface LiveDealerView {
  name: string; body: string; minBet?: number; cta?: string; reasons: Reason[];
}

export interface SurfaceState {
  fixture?: FixtureView;
  ticket?: TicketView;
  reward?: { title: string; body: string };
  boost?: CardView;
  quickAction?: CardView;
  push?: PushView;
  games?: GamesView;
  tournament?: TournamentView;
  liveDealer?: LiveDealerView;
  bonus?: CardView;
  islandActive: boolean;
  islandGaming: boolean;
  lastReasons: Reason[];
}

export const emptySurfaceState: SurfaceState = {
  islandActive: false,
  islandGaming: false,
  lastReasons: [],
};

const num = (v: unknown, f = 0): number => (typeof v === 'number' ? v : f);
const str = (v: unknown, f = ''): string => (typeof v === 'string' ? v : f);

function dirFrom(prev: number | undefined, next: number): 'up' | 'down' | 'flat' {
  if (prev === undefined || next === prev) return 'flat';
  return next > prev ? 'up' : 'down';
}

export function reduceSurface(state: SurfaceState, m: Moment): SurfaceState {
  const next: SurfaceState = { ...state, lastReasons: m.reasons };
  const d = m.data;
  const prevValue = state.ticket?.liveValue;

  const setFixture = (settled = false) => {
    next.fixture = {
      home: str(d.home, state.fixture?.home ?? 'Home'),
      away: str(d.away, state.fixture?.away ?? 'Away'),
      homeScore: num(d.homeScore, state.fixture?.homeScore),
      awayScore: num(d.awayScore, state.fixture?.awayScore),
      minute: num(d.minute, state.fixture?.minute),
      settled,
    };
  };
  const setTicket = (status: string) => {
    const liveValue = num(d.liveValue, state.ticket?.liveValue ?? 0);
    next.ticket = {
      label: state.ticket?.label ?? 'Your ticket',
      liveValue,
      status,
      direction: dirFrom(prevValue, liveValue),
    };
  };

  switch (m.kind) {
    case 'fixture_upcoming':
      setFixture(false);
      break;
    case 'live_activity_start':
      setFixture(false);
      setTicket('open');
      next.islandActive = true;
      next.islandGaming = false;
      break;
    case 'score_update':
      setFixture(false);
      setTicket('open');
      next.islandActive = true;
      next.islandGaming = false;
      break;
    case 'odds_move':
      setTicket(state.ticket?.status ?? 'open');
      next.islandActive = true;
      break;
    case 'cashout_window':
      setFixture(false);
      setTicket('cashout_available');
      next.islandActive = true;
      next.islandGaming = false;
      break;
    case 'ticket_settled':
      setFixture(true);
      next.ticket = {
        label: state.ticket?.label ?? 'Your ticket',
        liveValue: num(d.payout ?? d.cashoutValue, state.ticket?.liveValue ?? 0),
        status: str(d.status, 'won'),
        direction: 'flat',
      };
      next.islandActive = true;
      break;
    case 'reward_expiring':
      next.reward = { title: m.title, body: m.body };
      break;
    case 'geo_shortcut':
      next.quickAction = { title: m.title, body: m.body, reasons: m.reasons };
      break;
    case 'boost_offer':
      next.boost = { title: m.title, body: m.body, reasons: m.reasons };
      break;
    case 'slot_release':
    case 'slot_promo':
      next.games = {
        title: m.title,
        body: m.body,
        provider: typeof d.provider === 'string' ? d.provider : state.games?.provider,
        freeSpins: typeof d.freeSpins === 'number' ? d.freeSpins : undefined,
        cta: m.cta,
        reasons: m.reasons,
      };
      break;
    case 'tournament_starting_soon':
    case 'tournament_seats_low':
      next.tournament = {
        name: m.title,
        body: m.body,
        seatsLeft: typeof d.seatsLeft === 'number' ? d.seatsLeft : state.tournament?.seatsLeft,
        seatsTotal: typeof d.seatsTotal === 'number' ? d.seatsTotal : state.tournament?.seatsTotal,
        startsInMinutes:
          typeof d.startsInMinutes === 'number' ? d.startsInMinutes : state.tournament?.startsInMinutes,
        cta: m.cta,
        reasons: m.reasons,
      };
      break;
    case 'live_dealer_table_open':
    case 'live_dealer_join_offer':
      next.liveDealer = {
        name: m.title,
        body: m.body,
        minBet: typeof d.minBet === 'number' ? d.minBet : state.liveDealer?.minBet,
        cta: m.cta,
        reasons: m.reasons,
      };
      next.islandActive = true;
      next.islandGaming = true;
      break;
    case 'bonus_drop':
    case 'jackpot_alert':
      next.bonus = { title: m.title, body: m.body, reasons: m.reasons };
      break;
  }

  if (m.surface === 'push') next.push = { title: m.title, body: m.body, at: Date.now() };
  return next;
}
