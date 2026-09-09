import type { Decision, EventKind, Surface, WidgetFamily } from './types';

const PREFERRED_SURFACE: Record<EventKind, Surface> = {
  fixture_upcoming: 'widget',
  live_activity_start: 'live_activity',
  score_update: 'live_activity',
  odds_move: 'dynamic_island',
  cashout_window: 'live_activity',
  ticket_settled: 'live_activity',
  reward_expiring: 'widget',
  geo_shortcut: 'quick_action',
  boost_offer: 'widget',
  slot_release: 'widget',
  slot_promo: 'widget',
  tournament_starting_soon: 'live_activity',
  tournament_seats_low: 'live_activity',
  live_dealer_table_open: 'dynamic_island',
  live_dealer_join_offer: 'dynamic_island',
  bonus_drop: 'widget',
  jackpot_alert: 'dynamic_island',
};

const SILENT_FALLBACK: Surface = 'live_activity';

const TIME_CRITICAL: ReadonlySet<EventKind> = new Set<EventKind>([
  'ticket_settled',
  'cashout_window',
  'tournament_starting_soon',
]);

export function intendedSurface(kind: EventKind): Surface {
  return PREFERRED_SURFACE[kind];
}

export function isTimeCritical(kind: EventKind): boolean {
  return TIME_CRITICAL.has(kind);
}

export function finaliseSurface(kind: EventKind, decision: Decision): Surface {
  const preferred = PREFERRED_SURFACE[kind];
  if (isTimeCritical(kind) && decision.alertingAllowed && decision.contentClass === 'informational') {
    return 'push';
  }
  if (preferred === 'push' && !decision.alertingAllowed) return SILENT_FALLBACK;
  return preferred;
}

export function widgetFamilyFor(kind: EventKind): WidgetFamily | undefined {
  switch (kind) {
    case 'boost_offer':
      return 'boost';
    case 'fixture_upcoming':
      return 'teams';
    case 'ticket_settled':
    case 'cashout_window':
    case 'reward_expiring':
      return 'slip';
    case 'slot_release':
    case 'slot_promo':
      return 'games';
    case 'tournament_starting_soon':
    case 'tournament_seats_low':
      return 'tournaments';
    case 'live_dealer_table_open':
    case 'live_dealer_join_offer':
      return 'live_dealer';
    case 'bonus_drop':
    case 'jackpot_alert':
      return 'boost';
    default:
      return undefined;
  }
}
