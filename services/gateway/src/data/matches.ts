export interface MatchMarketOdds {
  home: number;
  draw: number;
  away: number;
}

export interface MatchListItem {
  id: string;
  competition: string;
  home: string;
  away: string;
  homeId: string;
  awayId: string;
  minute: number;
  homeScore: number;
  awayScore: number;
  live: boolean;
  kickoff: string;
  odds: MatchMarketOdds;
}

const now = Date.now();
const iso = (ms: number) => new Date(now + ms).toISOString();

export const seedMatches: MatchListItem[] = [
  {
    id: 'fx_dinamo_hajduk',
    competition: 'SuperSport HNL',
    home: 'GNK Dinamo',
    away: 'HNK Hajduk',
    homeId: 'dinamo',
    awayId: 'hajduk',
    minute: 0,
    homeScore: 0,
    awayScore: 0,
    live: false,
    kickoff: iso(3e5),
    odds: { home: 2.35, draw: 3.2, away: 3.05 },
  },
  {
    id: 'fx_rijeka_osijek',
    competition: 'SuperSport HNL',
    home: 'HNK Rijeka',
    away: 'NK Osijek',
    homeId: 'rijeka',
    awayId: 'osijek',
    minute: 63,
    homeScore: 1,
    awayScore: 1,
    live: true,
    kickoff: iso(-378e4),
    odds: { home: 2.1, draw: 3.1, away: 3.6 },
  },
  {
    id: 'fx_osijek_dinamo',
    competition: 'SuperSport HNL',
    home: 'NK Osijek',
    away: 'GNK Dinamo',
    homeId: 'osijek',
    awayId: 'dinamo',
    minute: 0,
    homeScore: 0,
    awayScore: 0,
    live: false,
    kickoff: iso(864e5),
    odds: { home: 3.5, draw: 3.3, away: 2.0 },
  },
];
