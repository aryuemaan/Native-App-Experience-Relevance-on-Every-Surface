import { describe, expect, it, vi } from 'vitest';
import { AuditLog } from '../domain/audit';
import { Graph } from '../domain/graph';
import { finaliseSurface, intendedSurface } from '../domain/momentRouter';
import { Pipeline } from '../domain/pipeline';
import { checkTone, stripSensitiveFinancials } from '../domain/tone';
import type { Decision, Moment } from '../domain/types';

const allow = (over: Partial<Decision> = {}): Decision => ({
  allowed: true,
  contentClass: 'informational',
  alertingAllowed: true,
  reasons: [],
  ...over,
});

describe('Moment Router — least intrusive first', () => {
  it('routes a pre-match fixture to the My Teams widget', () => {
    expect(intendedSurface('fixture_upcoming')).toBe('widget');
  });
  it('routes a live score to a Live Activity, not a push', () => {
    expect(finaliseSurface('score_update', allow())).toBe('live_activity');
  });
  it('escalates a time-critical, alert-permitted informational moment to push', () => {
    expect(finaliseSurface('ticket_settled', allow())).toBe('push');
  });
  it('downgrades to silent when alerting is not allowed', () => {
    expect(finaliseSurface('ticket_settled', allow({ alertingAllowed: false }))).not.toBe('push');
  });
  it('never routes a boost to a push', () => {
    expect(finaliseSurface('boost_offer', allow({ contentClass: 'inducement' }))).toBe('widget');
  });
});

describe('Dark-pattern linter', () => {
  it('accepts neutral status copy', () => {
    expect(checkTone('GOAL — Slavia 1:0', 'Your ticket is up').ok).toBe(true);
  });
  it('rejects urgency / pressure language', () => {
    expect(checkTone('HURRY — last chance!', 'Only 2 minutes left').ok).toBe(false);
    expect(checkTone('Boost', 'win it back now').ok).toBe(false);
  });
});

describe('Financial safety on ambient surfaces', () => {
  it('strips spend/loss fields from the payload', () => {
    const { data, stripped } = stripSensitiveFinancials(
      { liveValue: 18.9, loss: 40, spent: 100 },
      'widget',
    );
    expect(stripped).toBe(true);
    expect(data).toEqual({ liveValue: 18.9 });
  });
});

describe('Pipeline — end to end through the seeded users', () => {
  it('delivers an informational moment to Marek', () => {
    const graph = new Graph();
    const emitted: Moment[] = [];
    const pipeline = new Pipeline(graph, new AuditLog(), (_u, m) => emitted.push(m));
    const m = pipeline.process({
      id: 'e1', userId: 'marek', kind: 'score_update', title: 'GOAL', body: '1:0',
      data: { liveValue: 14.2 }, priority: 2, createdAt: new Date().toISOString(),
    });
    expect(m).not.toBeNull();
    expect(emitted).toHaveLength(1);
    expect(emitted[0]?.surface).toBe('live_activity');
  });

  it('SUPPRESSES a boost for Tomáš (deposit limit) but audits it', () => {
    const graph = new Graph();
    const audit = new AuditLog();
    const emit = vi.fn();
    const pipeline = new Pipeline(graph, audit, emit);
    const m = pipeline.process({
      id: 'e2', userId: 'tomas', kind: 'boost_offer', title: 'Boosted for You', body: 'A price boost',
      data: { boostId: 'bst_hajduk_win' }, priority: 1, createdAt: new Date().toISOString(),
    });
    expect(m).toBeNull();
    expect(emit).not.toHaveBeenCalled();
    expect(audit.forUser('tomas')[0]?.reasons.map((r) => r.code)).toContain('RG_DEPOSIT_LIMIT_REACHED');
  });

  it('REJECTS a pushy promo via the dark-pattern linter', () => {
    const graph = new Graph();
    const audit = new AuditLog();
    const pipeline = new Pipeline(graph, audit, () => undefined);
    const m = pipeline.process({
      id: 'e3', userId: 'marek', kind: 'boost_offer', title: 'HURRY — last chance!',
      body: 'don’t miss out', data: {}, priority: 1, createdAt: new Date().toISOString(),
    });
    expect(m).toBeNull();
    expect(audit.forUser('marek')[0]?.reasons.map((r) => r.code)).toContain('CONTENT_DARK_PATTERN');
  });

  it('blocks ALL surfaces for an unverified account (Jakub)', () => {
    const graph = new Graph();
    const pipeline = new Pipeline(graph, new AuditLog(), () => undefined);
    const m = pipeline.process({
      id: 'e4', userId: 'jakub', kind: 'score_update', title: 'GOAL', body: '1:0',
      data: {}, priority: 2, createdAt: new Date().toISOString(),
    });
    expect(m).toBeNull();
  });

  it('enforces the weekly boost cap across repeated deliveries', () => {
    const graph = new Graph();
    const pipeline = new Pipeline(graph, new AuditLog(), () => undefined);
    const fire = () =>
      pipeline.process({
        id: `b_${Math.random()}`, userId: 'marek', kind: 'boost_offer',
        title: 'Boosted for You', body: 'A price boost on a market you follow',
        data: { boostId: 'bst_dinamo_btts' }, priority: 1, createdAt: new Date().toISOString(),
      });
    expect(fire()).not.toBeNull(); // 1st — cap is 2
    expect(fire()).not.toBeNull(); // 2nd
    expect(fire()).toBeNull(); // 3rd — capped
  });
});

describe('Graph — user actions', () => {
  it('cashes out an open ticket and marks it settled', () => {
    const graph = new Graph();
    const r = graph.cashout('marek');
    expect(r.ok).toBe(true);
    expect(r.ticket?.status).toBe('cashed_out');
  });
  it('blocks repeat-bet for a self-excluded user', () => {
    const graph = new Graph();
    expect(graph.repeatBetAllowed('eva')).toEqual({ allowed: false, reason: 'RG_SELF_EXCLUDED' });
  });
  it('allows repeat-bet for a healthy user', () => {
    const graph = new Graph();
    expect(graph.repeatBetAllowed('marek').allowed).toBe(true);
  });
});
