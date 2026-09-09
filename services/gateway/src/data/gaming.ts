import type { Bonus, LiveDealerTable, Slot, Tournament } from '../domain/types';

export const seedSlots: Slot[] = [
  { id: 'slot_bonanza', name: 'Sweet Bonanza', provider: 'Pragmatic Play', isNew: false, freeSpins: 0 },
  { id: 'slot_gates', name: 'Gates of Olympus', provider: 'Pragmatic Play', isNew: false, freeSpins: 0 },
  { id: 'slot_wanted', name: 'Wanted Dead or a Wild', provider: 'Hacksaw Gaming', isNew: true, freeSpins: 3 },
  { id: 'slot_bigbass', name: 'Big Bass Bonanza', provider: 'Pragmatic Play', isNew: false, freeSpins: 0 },
];

export const seedTournaments: Tournament[] = [
  { id: 'tourn_daily_kok', name: 'Daily Kokice Cup', game: 'Sweet Bonanza', seatsTotal: 128, seatsLeft: 12, startsInMinutes: 8, buyIn: 5 },
  { id: 'tourn_weekend', name: 'Weekend Jackpot Klasik', game: 'Gates of Olympus', seatsTotal: 256, seatsLeft: 80, startsInMinutes: 120, buyIn: 10 },
];

export const seedTables: LiveDealerTable[] = [
  { id: 'table_hr_roulette', name: 'Hrvatski Auto Rulet', game: 'Roulette', minBet: 5, open: true },
  { id: 'table_bj_vip', name: 'Blackjack VIP', game: 'Blackjack', minBet: 25, open: false },
];

export const seedBonuses: Bonus[] = [
  { id: 'bonus_welcome', label: 'Dobrodosli bonus', kind: 'welcome' },
  { id: 'bonus_reload', label: 'Reload petak', kind: 'reload' },
];

export const gamingCatalog = {
  slots: seedSlots,
  tournaments: seedTournaments,
  tables: seedTables,
  bonuses: seedBonuses,
};
