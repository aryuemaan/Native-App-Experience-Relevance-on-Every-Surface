import type { ContentClass, EventKind, Vertical, WidgetFamily } from './types';

const INDUCEMENT_KINDS: ReadonlySet<EventKind> = new Set<EventKind>([
  'boost_offer',
  'slot_promo',
  'tournament_seats_low',
  'live_dealer_join_offer',
  'bonus_drop',
  'jackpot_alert',
]);

const GAMING_KINDS: ReadonlySet<EventKind> = new Set<EventKind>([
  'slot_release',
  'slot_promo',
  'tournament_starting_soon',
  'tournament_seats_low',
  'live_dealer_table_open',
  'live_dealer_join_offer',
  'bonus_drop',
  'jackpot_alert',
]);

export function classify(kind: EventKind): ContentClass {
  return INDUCEMENT_KINDS.has(kind) ? 'inducement' : 'informational';
}

export function verticalFor(kind: EventKind): Vertical {
  return GAMING_KINDS.has(kind) ? 'gaming' : 'sports';
}

export function widgetFamilyFor(kind: EventKind): WidgetFamily | undefined {
  switch (kind) {
    case 'fixture_upcoming':
      return 'teams';
    case 'ticket_settled':
    case 'cashout_window':
    case 'reward_expiring':
      return 'slip';
    case 'boost_offer':
      return 'boost';
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
