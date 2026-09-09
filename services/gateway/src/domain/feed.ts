import { id } from '../logger';
import type { Graph } from './graph';
import type { RawEvent } from './types';

export interface ScenarioStep {
  afterMs: number;
  make: (userId: string) => RawEvent;
  apply?: (graph: Graph, userId: string) => void;
}

const ev = (
  userId: string,
  kind: RawEvent['kind'],
  title: string,
  body: string,
  priority: RawEvent['priority'],
  data: Record<string, unknown> = {},
): RawEvent => ({
  id: id('evt_'),
  userId,
  kind,
  title,
  body,
  data,
  fixtureId: 'fx_dinamo_hajduk',
  priority,
  createdAt: new Date().toISOString(),
});

const ticketId = (graph: Graph, userId: string) => graph.getUser(userId)?.tickets[0]?.id;

export const matchScenario: ScenarioStep[] = [
  {
    afterMs: 400,
    make: (u) =>
      ev(u, 'fixture_upcoming', 'Dinamo - Hajduk', 'Vjecni derbi pocinje za 5 min - SuperSport HNL', 0, {
        home: 'Dinamo', away: 'Hajduk', homeScore: 0, awayScore: 0, minute: 0,
      }),
  },
  {
    afterMs: 1500,
    make: (u) =>
      ev(u, 'live_activity_start', 'Uzivo pracenje', 'Tvoj listic za Dinamo je sada uzivo', 1, {
        home: 'Dinamo', away: 'Hajduk', homeScore: 0, awayScore: 0, minute: 1,
        liveValue: 10, oddsDelta: 0,
      }),
  },
  {
    afterMs: 4500,
    apply: (g, u) => {
      const t = ticketId(g, u);
      if (t) g.updateTicketLive(u, t, { liveValue: 14.2, liveOdds: 1.66 });
    },
    make: (u) =>
      ev(u, 'score_update', 'GOL - Dinamo 1:0', 'Baturina 23. min - tvoj listic raste', 2, {
        home: 'Dinamo', away: 'Hajduk', homeScore: 1, awayScore: 0, minute: 23,
        liveValue: 14.2, oddsDelta: -0.69,
      }),
  },
  {
    afterMs: 9000,
    apply: (g, u) => {
      const t = ticketId(g, u);
      if (t) g.updateTicketLive(u, t, { liveValue: 18.9, status: 'cashout_available' });
    },
    make: (u) =>
      ev(u, 'cashout_window', 'Isplata 18,90 EUR', 'Dinamo kontrolira - isplati bilo kada', 2, {
        home: 'Dinamo', away: 'Hajduk', homeScore: 1, awayScore: 0, minute: 58,
        liveValue: 18.9, oddsDelta: 0.0,
      }),
  },
  {
    afterMs: 12000,
    make: (u) =>
      ev(u, 'boost_offer', 'Boost za tebe: Dinamo BTTS 2.20', 'Povecana kvota na trzistu koje pratis', 1, {
        boostId: 'bst_dinamo_btts', teamId: 'dinamo', boostedOdds: 2.2,
      }),
  },
  {
    afterMs: 15000,
    make: (u) =>
      ev(u, 'geo_shortcut', 'U blizini si PSK poslovnice', 'Precac: skeniraj listic ili provjeri kvote', 0, {
        context: 'near_shop',
      }),
  },
];

export type EmitFn = (event: RawEvent) => void;

export function runScenario(userId: string, steps: ScenarioStep[], graph: Graph, emit: EmitFn): () => void {
  const timers: NodeJS.Timeout[] = [];
  for (const step of steps) {
    timers.push(
      setTimeout(() => {
        step.apply?.(graph, userId);
        emit(step.make(userId));
      }, step.afterMs),
    );
  }
  return () => timers.forEach(clearTimeout);
}

export function makeBoost(graph: Graph, userId: string): RawEvent {
  const u = graph.getUser(userId);
  const boost = u?.boosts[0];
  return ev(
    userId,
    'boost_offer',
    boost ? `Boost za tebe: ${boost.label}` : 'Boost za tebe',
    'Povecana kvota na trzistu koje pratis',
    1,
    { boostId: boost?.id, teamId: boost?.teamId, boostedOdds: boost?.boostedOdds },
  );
}

export function makePushyPromo(userId: string): RawEvent {
  return ev(
    userId,
    'boost_offer',
    'POZURI - zadnja prilika!',
    'Samo jos 2 minute, ne propusti i vrati svoj gubitak odmah!',
    1,
    { boostId: 'bst_pushy' },
  );
}

export function makeCashoutSettled(userId: string, value: number): RawEvent {
  return ev(userId, 'ticket_settled', `Isplaceno ${value.toFixed(2)} EUR`, 'Tvoj listic je namiren', 2, {
    home: 'Dinamo', away: 'Hajduk', homeScore: 1, awayScore: 0, minute: 58,
    status: 'cashed_out', payout: value,
  });
}

const gev = (
  userId: string,
  kind: RawEvent['kind'],
  title: string,
  body: string,
  priority: RawEvent['priority'],
  data: Record<string, unknown> = {},
  cta?: string,
): RawEvent => ({
  id: id('evt_'),
  userId,
  kind,
  title,
  body,
  cta,
  data,
  priority,
  createdAt: new Date().toISOString(),
});

export const gamingSlotScenario: ScenarioStep[] = [
  {
    afterMs: 400,
    make: (u) =>
      gev(u, 'slot_release', 'Nova igra dodana', 'Wanted Dead or a Wild - Hacksaw Gaming', 0, {
        slotId: 'slot_wanted', provider: 'Hacksaw Gaming', isNew: true,
      }),
  },
  {
    afterMs: 1400,
    make: (u) =>
      gev(u, 'slot_promo', 'Wanted Dead or a Wild', '3 besplatna vrtnja spremna za tebe', 1, {
        slotId: 'slot_wanted', freeSpins: 3,
      }, 'Zavrti'),
  },
];

export const gamingTournamentScenario: ScenarioStep[] = [
  {
    afterMs: 400,
    make: (u) =>
      gev(u, 'tournament_starting_soon', 'Daily Kokice Cup', 'Pocinje za 8 minuta', 2, {
        tournamentId: 'tourn_daily_kok', startsInMinutes: 8, seatsLeft: 12,
      }),
  },
  {
    afterMs: 1400,
    make: (u) =>
      gev(u, 'tournament_seats_low', 'Daily Kokice Cup', 'Jos 12 mjesta - rezerviraj svoje', 1, {
        tournamentId: 'tourn_daily_kok', seatsLeft: 12, seatsTotal: 128, buyIn: 5,
      }, 'Rezerviraj mjesto'),
  },
];

export const gamingLiveDealerScenario: ScenarioStep[] = [
  {
    afterMs: 400,
    make: (u) =>
      gev(u, 'live_dealer_table_open', 'Hrvatski Auto Rulet', 'Stol je slobodan - min ulog 5 EUR', 1, {
        tableId: 'table_hr_roulette', minBet: 5,
      }),
  },
  {
    afterMs: 1400,
    make: (u) =>
      gev(u, 'live_dealer_join_offer', 'Hrvatski Auto Rulet', 'Sjedni za stol', 1, {
        tableId: 'table_hr_roulette', minBet: 5,
      }, 'Udi'),
  },
];

export const gamingScenarios: Record<string, ScenarioStep[]> = {
  slot: gamingSlotScenario,
  tournament: gamingTournamentScenario,
  live_dealer: gamingLiveDealerScenario,
};

export function makeBonusDrop(userId: string): RawEvent {
  return gev(userId, 'bonus_drop', 'Bonus za tebe', 'Reload petak aktivan', 1, {
    bonusId: 'bonus_reload',
  }, 'Preuzmi');
}
