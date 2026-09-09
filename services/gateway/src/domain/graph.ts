import type {
  Boost,
  Consent,
  RGStatus,
  RawEvent,
  SurfaceConsent,
  Team,
  Ticket,
  User,
} from './types';
import { seedTeams, seedUsers } from '../data/seed';

/** A consent patch where the per-surface flags may be updated individually. */
export type ConsentPatch = Partial<Omit<Consent, 'surfaces'>> & {
  surfaces?: Partial<SurfaceConsent>;
};

/** Result of a user-initiated cash-out. */
export interface CashoutResult {
  ok: boolean;
  ticket?: Ticket;
  reason?: string;
}

/**
 * The Interest & Activity Graph — an in-memory read-model over the operator's
 * profile + betting systems, behind a repository-shaped interface. Also owns
 * user-initiated actions (cash-out, repeat-bet) and backend boost frequency
 * counters, so those rules live server-side rather than being client-trusted.
 */
export class Graph {
  private users = new Map<string, User>();
  private teams = new Map<string, Team>();
  /** userId → boostId → deliveries this rolling week. */
  private boostDeliveries = new Map<string, Map<string, number>>();

  constructor() {
    for (const t of seedTeams) this.teams.set(t.id, t);
    for (const u of seedUsers) this.users.set(u.id, structuredClone(u));
  }

  listUsers(): User[] {
    return [...this.users.values()];
  }
  getUser(userId: string): User | undefined {
    return this.users.get(userId);
  }
  requireUser(userId: string): User {
    const u = this.users.get(userId);
    if (!u) throw new Error(`unknown user: ${userId}`);
    return u;
  }
  getTeam(teamId: string): Team | undefined {
    return this.teams.get(teamId);
  }

  follow(userId: string, teamId: string): User {
    const u = this.requireUser(userId);
    if (!u.follows.teams.includes(teamId)) u.follows.teams.push(teamId);
    return u;
  }
  unfollow(userId: string, teamId: string): User {
    const u = this.requireUser(userId);
    u.follows.teams = u.follows.teams.filter((t) => t !== teamId);
    return u;
  }

  updateConsent(userId: string, patch: ConsentPatch): User {
    const u = this.requireUser(userId);
    u.consent = {
      ...u.consent,
      ...patch,
      surfaces: { ...u.consent.surfaces, ...(patch.surfaces ?? {}) },
      updatedAt: new Date().toISOString(),
    };
    return u;
  }
  updateRG(userId: string, patch: Partial<RGStatus>): User {
    const u = this.requireUser(userId);
    u.rg = { ...u.rg, ...patch };
    return u;
  }
  updateAccount(userId: string, patch: Partial<User['account']>): User {
    const u = this.requireUser(userId);
    u.account = { ...u.account, ...patch };
    return u;
  }

  /** Update a ticket's live cash-out value / odds as the match unfolds. */
  updateTicketLive(
    userId: string,
    ticketId: string,
    patch: Partial<Pick<Ticket, 'liveValue' | 'liveOdds' | 'status'>>,
  ): Ticket | undefined {
    const t = this.requireUser(userId).tickets.find((x) => x.id === ticketId);
    if (t) Object.assign(t, patch);
    return t;
  }

  /** User-initiated cash-out (from the Live Activity / watch — no app launch). */
  cashout(userId: string, ticketId?: string): CashoutResult {
    const u = this.requireUser(userId);
    // A user acting on their own bet is always eligible provided the account is.
    if (!u.account.kycVerified || !u.account.ageVerified || !u.account.marketAllowed) {
      return { ok: false, reason: 'ELIGIBILITY_NOT_VERIFIED' };
    }
    const t = ticketId
      ? u.tickets.find((x) => x.id === ticketId)
      : u.tickets.find((x) => x.status === 'open' || x.status === 'cashout_available');
    if (!t) return { ok: false, reason: 'NO_OPEN_TICKET' };
    if (t.status === 'cashed_out' || t.status === 'won' || t.status === 'lost') {
      return { ok: false, reason: 'ALREADY_SETTLED' };
    }
    t.status = 'cashed_out';
    return { ok: true, ticket: t };
  }

  /** Repeat-bet convenience action — HARD responsible-gambling guardrail. */
  repeatBetAllowed(userId: string): { allowed: boolean; reason?: string } {
    const u = this.requireUser(userId);
    if (u.rg.selfExcluded) return { allowed: false, reason: 'RG_SELF_EXCLUDED' };
    if (u.rg.riskLevel === 'high') return { allowed: false, reason: 'RG_AT_RISK' };
    if (u.rg.depositLimitReached) return { allowed: false, reason: 'RG_DEPOSIT_LIMIT_REACHED' };
    return { allowed: true };
  }

  // --- backend-enforced boost frequency caps (not client-trusted) ---
  private boostId(event: RawEvent): string {
    return (event.data.boostId as string | undefined) ?? event.kind;
  }
  isBoostCapReached(userId: string, event: RawEvent): boolean {
    const u = this.requireUser(userId);
    const bid = this.boostId(event);
    const boost: Boost | undefined = u.boosts.find((b) => b.id === bid);
    const cap = boost?.weeklyCap ?? 1;
    const count = this.boostDeliveries.get(userId)?.get(bid) ?? 0;
    return count >= cap;
  }
  recordBoostDelivery(userId: string, event: RawEvent): void {
    const bid = this.boostId(event);
    const perUser = this.boostDeliveries.get(userId) ?? new Map<string, number>();
    perUser.set(bid, (perUser.get(bid) ?? 0) + 1);
    this.boostDeliveries.set(userId, perUser);
  }
}
