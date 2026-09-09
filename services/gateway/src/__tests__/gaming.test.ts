import { describe, expect, it } from 'vitest';
import { evaluate } from '../domain/careGate';
import { classify, verticalFor, widgetFamilyFor } from '../domain/contentClass';
import { finaliseSurface, intendedSurface } from '../domain/momentRouter';
import type { Decision, Surface, User } from '../domain/types';

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'g1',
    name: 'Gamer',
    timezoneOffsetMinutes: 0,
    account: { kycVerified: true, ageVerified: true, marketAllowed: true, market: 'HR' },
    follows: { teams: [], competitions: [] },
    favoriteSlots: ['slot_wanted'],
    followedTournaments: ['tourn_daily_kok'],
    liveDealerTables: ['table_hr_roulette'],
    tickets: [],
    rewards: [],
    boosts: [],
    consent: {
      personalisation: true,
      marketing: true,
      surfaces: { liveActivity: true, widgets: true, watch: true, geolocation: true, voice: true },
      updatedAt: '',
    },
    rg: { selfExcluded: false, riskLevel: 'none', depositLimitReached: false, quietHours: { start: '23:00', end: '08:00' } },
    ...overrides,
  };
}

const noon = new Date('2026-06-01T12:00:00.000Z');
const ctx = (surface: Surface = 'widget') => ({ now: noon, intendedSurface: surface, dailyAlertCapReached: false });
const decision = (contentClass: Decision['contentClass'], alerting: boolean): Decision => ({
  allowed: true,
  contentClass,
  alertingAllowed: alerting,
  reasons: [],
});

describe('Gaming — content classification', () => {
  it('tags gaming kinds with the gaming vertical', () => {
    expect(verticalFor('slot_release')).toBe('gaming');
    expect(verticalFor('tournament_seats_low')).toBe('gaming');
    expect(verticalFor('live_dealer_table_open')).toBe('gaming');
    expect(verticalFor('score_update')).toBe('sports');
  });

  it('classifies gaming promos as inducements and updates as informational', () => {
    expect(classify('slot_promo')).toBe('inducement');
    expect(classify('tournament_seats_low')).toBe('inducement');
    expect(classify('live_dealer_join_offer')).toBe('inducement');
    expect(classify('bonus_drop')).toBe('inducement');
    expect(classify('slot_release')).toBe('informational');
    expect(classify('tournament_starting_soon')).toBe('informational');
    expect(classify('live_dealer_table_open')).toBe('informational');
  });
});

describe('Gaming — Care Gate suppression', () => {
  it('blocks a slot promo for a self-excluded user', () => {
    const u = makeUser({ rg: { selfExcluded: true, riskLevel: 'none', depositLimitReached: false, quietHours: { start: '23:00', end: '08:00' } } });
    const d = evaluate(u, classify('slot_promo'), ctx());
    expect(d.allowed).toBe(false);
    expect(d.reasons.some((r) => r.code === 'RG_SELF_EXCLUDED')).toBe(true);
  });

  it('blocks a limited-seat inducement for a deposit-limit-reached user', () => {
    const u = makeUser({ rg: { selfExcluded: false, riskLevel: 'elevated', depositLimitReached: true, quietHours: { start: '23:00', end: '08:00' } } });
    const d = evaluate(u, classify('tournament_seats_low'), ctx('live_activity'));
    expect(d.allowed).toBe(false);
    expect(d.reasons.some((r) => r.code === 'RG_DEPOSIT_LIMIT_REACHED')).toBe(true);
  });

  it('blocks a bonus drop for a high-risk user', () => {
    const u = makeUser({ rg: { selfExcluded: false, riskLevel: 'high', depositLimitReached: false, quietHours: { start: '23:00', end: '08:00' } } });
    const d = evaluate(u, classify('bonus_drop'), ctx());
    expect(d.allowed).toBe(false);
    expect(d.reasons.some((r) => r.code === 'RG_AT_RISK')).toBe(true);
  });

  it('lets informational tournament start flow for a self-excluded user (continuity)', () => {
    const u = makeUser({ rg: { selfExcluded: true, riskLevel: 'none', depositLimitReached: false, quietHours: { start: '23:00', end: '08:00' } } });
    const d = evaluate(u, classify('tournament_starting_soon'), ctx('live_activity'));
    expect(d.allowed).toBe(true);
    expect(d.reasons.some((r) => r.code === 'ALLOWED_INFORMATIONAL')).toBe(true);
  });

  it('lets a new-slot release flow for a deposit-limit user (no inducement)', () => {
    const u = makeUser({ rg: { selfExcluded: false, riskLevel: 'elevated', depositLimitReached: true, quietHours: { start: '23:00', end: '08:00' } } });
    const d = evaluate(u, classify('slot_release'), ctx());
    expect(d.allowed).toBe(true);
  });

  it('allows a gaming inducement for an eligible, consented user', () => {
    const u = makeUser();
    const d = evaluate(u, classify('slot_promo'), ctx());
    expect(d.allowed).toBe(true);
    expect(d.reasons.some((r) => r.code === 'ALLOWED_MARKETING_CONSENTED')).toBe(true);
  });
});

describe('Gaming — Moment Router', () => {
  it('routes a new slot release to the games widget', () => {
    expect(intendedSurface('slot_release')).toBe('widget');
    expect(widgetFamilyFor('slot_release')).toBe('games');
  });

  it('routes a live dealer table opening to the Dynamic Island', () => {
    expect(intendedSurface('live_dealer_table_open')).toBe('dynamic_island');
    expect(finaliseSurface('live_dealer_table_open', decision('informational', true))).toBe('dynamic_island');
  });

  it('escalates an informational tournament start to push when alerting is allowed', () => {
    expect(finaliseSurface('tournament_starting_soon', decision('informational', true))).toBe('push');
  });

  it('never escalates a gaming inducement to push', () => {
    expect(finaliseSurface('tournament_seats_low', decision('inducement', true))).toBe('live_activity');
  });
});
