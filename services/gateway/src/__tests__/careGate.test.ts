import { describe, expect, it } from 'vitest';
import { evaluate, isWithinQuietHours } from '../domain/careGate';
import type { Surface, User } from '../domain/types';

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'u1',
    name: 'Test',
    timezoneOffsetMinutes: 0,
    account: { kycVerified: true, ageVerified: true, marketAllowed: true, market: 'CZ' },
    follows: { teams: [], competitions: [] },
    tickets: [],
    rewards: [],
    boosts: [],
    consent: {
      personalisation: true,
      marketing: true,
      surfaces: { liveActivity: true, widgets: true, watch: true, geolocation: true, voice: true },
      updatedAt: '',
    },
    rg: {
      selfExcluded: false,
      riskLevel: 'none',
      depositLimitReached: false,
      quietHours: { start: '23:00', end: '08:00' },
    },
    ...overrides,
  };
}

const noon = new Date('2026-06-01T12:00:00.000Z');
const ctx = (surface: Surface = 'widget') => ({
  now: noon,
  intendedSurface: surface,
  dailyAlertCapReached: false,
});

describe('Care Gate — eligibility (KYC / age / market)', () => {
  it('blocks EVERY surface for an unverified account', () => {
    const u = makeUser({ account: { kycVerified: false, ageVerified: true, marketAllowed: true, market: 'PL' } });
    const d = evaluate(u, 'informational', ctx());
    expect(d.allowed).toBe(false);
    expect(d.reasons[0]?.code).toBe('ELIGIBILITY_NOT_VERIFIED');
  });
});

describe('Care Gate — consent', () => {
  it('blocks everything without personalisation consent', () => {
    const u = makeUser();
    u.consent.personalisation = false;
    const d = evaluate(u, 'informational', ctx());
    expect(d.allowed).toBe(false);
    expect(d.reasons.map((r) => r.code)).toContain('CONSENT_PERSONALISATION_MISSING');
  });

  it('blocks a surface whose per-surface consent is off', () => {
    const u = makeUser();
    u.consent.surfaces.widgets = false;
    const d = evaluate(u, 'informational', ctx('widget'));
    expect(d.allowed).toBe(false);
    expect(d.reasons.map((r) => r.code)).toContain('CONSENT_SURFACE_OFF');
  });

  it('allows a different surface that is still on', () => {
    const u = makeUser();
    u.consent.surfaces.widgets = false;
    const d = evaluate(u, 'informational', ctx('live_activity'));
    expect(d.allowed).toBe(true);
  });

  it('blocks inducements without marketing consent', () => {
    const u = makeUser();
    u.consent.marketing = false;
    const d = evaluate(u, 'inducement', ctx('widget'));
    expect(d.allowed).toBe(false);
    expect(d.reasons.map((r) => r.code)).toContain('CONSENT_MARKETING_MISSING');
  });
});

describe('Care Gate — responsible gaming (inducements)', () => {
  it('blocks boosts for self-excluded users', () => {
    const u = makeUser({ rg: { ...makeUser().rg, selfExcluded: true } });
    const d = evaluate(u, 'inducement', ctx('widget'));
    expect(d.allowed).toBe(false);
    expect(d.reasons.map((r) => r.code)).toContain('RG_SELF_EXCLUDED');
  });

  it('blocks boosts when a deposit limit is reached', () => {
    const u = makeUser({ rg: { ...makeUser().rg, depositLimitReached: true } });
    const d = evaluate(u, 'inducement', ctx('widget'));
    expect(d.allowed).toBe(false);
    expect(d.reasons.map((r) => r.code)).toContain('RG_DEPOSIT_LIMIT_REACHED');
  });

  it('blocks boosts once the weekly cap is reached', () => {
    const u = makeUser();
    const d = evaluate(u, 'inducement', { ...ctx('widget'), boostCapReached: true });
    expect(d.allowed).toBe(false);
    expect(d.reasons.map((r) => r.code)).toContain('BOOST_WEEKLY_CAP_REACHED');
  });

  it('STILL allows informational continuity for a self-excluded user', () => {
    const u = makeUser({ rg: { ...makeUser().rg, selfExcluded: true } });
    const d = evaluate(u, 'informational', ctx('live_activity'));
    expect(d.allowed).toBe(true);
  });
});

describe('Care Gate — quiet hours & caps gate the push surface only', () => {
  it('suppresses push inside quiet hours but still allows the moment', () => {
    const night = new Date('2026-06-01T02:00:00.000Z');
    const d = evaluate(makeUser(), 'informational', {
      now: night, intendedSurface: 'live_activity', dailyAlertCapReached: false,
    });
    expect(d.allowed).toBe(true);
    expect(d.alertingAllowed).toBe(false);
    expect(d.reasons.map((r) => r.code)).toContain('QUIET_HOURS');
  });

  it('suppresses push when the daily cap is reached', () => {
    const d = evaluate(makeUser(), 'informational', {
      now: noon, intendedSurface: 'push', dailyAlertCapReached: true,
    });
    expect(d.alertingAllowed).toBe(false);
    expect(d.reasons.map((r) => r.code)).toContain('DAILY_ALERT_CAP_REACHED');
  });
});

describe('isWithinQuietHours', () => {
  it('handles windows that wrap past midnight', () => {
    const u = makeUser();
    expect(isWithinQuietHours(u, new Date('2026-06-01T02:00:00.000Z'))).toBe(true);
    expect(isWithinQuietHours(u, new Date('2026-06-01T12:00:00.000Z'))).toBe(false);
  });
});
