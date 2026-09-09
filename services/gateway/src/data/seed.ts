import type { Team, User } from '../domain/types';

export const seedTeams: Team[] = [
  { id: 'dinamo', name: 'GNK Dinamo Zagreb', shortName: 'Dinamo', competition: 'SuperSport HNL' },
  { id: 'hajduk', name: 'HNK Hajduk Split', shortName: 'Hajduk', competition: 'SuperSport HNL' },
  { id: 'rijeka', name: 'HNK Rijeka', shortName: 'Rijeka', competition: 'SuperSport HNL' },
  { id: 'osijek', name: 'NK Osijek', shortName: 'Osijek', competition: 'SuperSport HNL' },
];

const now = Date.now();
const iso = (msFromNow: number) => new Date(now + msFromNow).toISOString();

const fullSurfaces = {
  liveActivity: true,
  widgets: true,
  watch: true,
  geolocation: true,
  voice: true,
};

export const seedUsers: User[] = [
  {
    id: 'marek',
    name: 'Marko',
    timezoneOffsetMinutes: 120,
    account: { kycVerified: true, ageVerified: true, marketAllowed: true, market: 'HR' },
    follows: { teams: ['dinamo'], competitions: ['SuperSport HNL'] },
    favoriteSlots: ['slot_wanted', 'slot_bonanza'],
    followedTournaments: ['tourn_daily_kok'],
    liveDealerTables: ['table_hr_roulette'],
    tickets: [
      {
        id: 'tkt_marek_1',
        label: 'GNK Dinamo pobjeda',
        stake: 10,
        potentialReturn: 23.5,
        odds: 2.35,
        liveOdds: 2.35,
        liveValue: 10,
        status: 'open',
        fixtureId: 'fx_dinamo_hajduk',
        liveEligible: true,
      },
    ],
    rewards: [
      { id: 'rw_marek_1', type: 'free_bet', label: '5 EUR besplatna oklada', progress: 1, expiresAt: iso(72e5) },
    ],
    boosts: [
      {
        id: 'bst_dinamo_btts',
        teamId: 'dinamo',
        market: 'Oba tima daju gol',
        label: 'Dinamo BTTS 1.90 -> 2.20',
        baseOdds: 1.9,
        boostedOdds: 2.2,
        weeklyCap: 2,
      },
    ],
    consent: {
      personalisation: true,
      marketing: true,
      surfaces: { ...fullSurfaces },
      tcfString: 'CPxxDEMOxxCONSENTxxSTRING',
      updatedAt: new Date().toISOString(),
    },
    rg: {
      selfExcluded: false,
      riskLevel: 'none',
      depositLimitReached: false,
      quietHours: { start: '23:00', end: '08:00' },
    },
  },
  {
    id: 'tomas',
    name: 'Tomislav',
    timezoneOffsetMinutes: 120,
    account: { kycVerified: true, ageVerified: true, marketAllowed: true, market: 'HR' },
    follows: { teams: ['hajduk'], competitions: ['SuperSport HNL'] },
    favoriteSlots: ['slot_gates'],
    followedTournaments: ['tourn_daily_kok'],
    liveDealerTables: [],
    tickets: [
      {
        id: 'tkt_tomas_1',
        label: 'HNK Hajduk pobjeda',
        stake: 15,
        potentialReturn: 27,
        odds: 1.8,
        liveOdds: 1.8,
        liveValue: 15,
        status: 'open',
        fixtureId: 'fx_dinamo_hajduk',
        liveEligible: true,
      },
    ],
    rewards: [],
    boosts: [
      {
        id: 'bst_hajduk_win',
        teamId: 'hajduk',
        market: 'Hajduk pobjeda',
        label: 'Hajduk pobjeda 1.80 -> 2.05',
        baseOdds: 1.8,
        boostedOdds: 2.05,
        weeklyCap: 2,
      },
    ],
    consent: {
      personalisation: true,
      marketing: true,
      surfaces: { ...fullSurfaces },
      updatedAt: new Date().toISOString(),
    },
    rg: {
      selfExcluded: false,
      riskLevel: 'elevated',
      depositLimitReached: true,
      quietHours: { start: '23:00', end: '08:00' },
    },
  },
  {
    id: 'eva',
    name: 'Iva',
    timezoneOffsetMinutes: 120,
    account: { kycVerified: true, ageVerified: true, marketAllowed: true, market: 'HR' },
    follows: { teams: ['rijeka'], competitions: ['SuperSport HNL'] },
    favoriteSlots: ['slot_bonanza'],
    followedTournaments: ['tourn_weekend'],
    liveDealerTables: ['table_hr_roulette'],
    tickets: [],
    rewards: [],
    boosts: [
      {
        id: 'bst_rijeka_win',
        teamId: 'rijeka',
        market: 'Rijeka pobjeda',
        label: 'Rijeka pobjeda 2.00 -> 2.30',
        baseOdds: 2.0,
        boostedOdds: 2.3,
        weeklyCap: 2,
      },
    ],
    consent: {
      personalisation: true,
      marketing: false,
      surfaces: { ...fullSurfaces },
      updatedAt: new Date().toISOString(),
    },
    rg: {
      selfExcluded: true,
      riskLevel: 'none',
      depositLimitReached: false,
      quietHours: { start: '22:00', end: '09:00' },
    },
  },
  {
    id: 'jakub',
    name: 'Josip',
    timezoneOffsetMinutes: 120,
    account: { kycVerified: false, ageVerified: true, marketAllowed: true, market: 'HR' },
    follows: { teams: ['osijek'], competitions: ['SuperSport HNL'] },
    favoriteSlots: [],
    followedTournaments: [],
    liveDealerTables: [],
    tickets: [],
    rewards: [],
    boosts: [],
    consent: {
      personalisation: true,
      marketing: true,
      surfaces: { ...fullSurfaces },
      updatedAt: new Date().toISOString(),
    },
    rg: {
      selfExcluded: false,
      riskLevel: 'none',
      depositLimitReached: false,
      quietHours: { start: '23:00', end: '08:00' },
    },
  },
];
