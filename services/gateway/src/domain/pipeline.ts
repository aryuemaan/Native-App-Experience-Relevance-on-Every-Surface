import { config } from '../config';
import { id } from '../logger';
import type { AuditLog } from './audit';
import { evaluate } from './careGate';
import { classify, verticalFor } from './contentClass';
import type { Graph } from './graph';
import { finaliseSurface, intendedSurface, widgetFamilyFor } from './momentRouter';
import { checkTone, stripSensitiveFinancials } from './tone';
import type { Moment, RawEvent, Reason, Surface } from './types';

interface DayCounter {
  day: string;
  pushes: number;
}

/**
 * The single path from a raw event to a surface. Order is fixed and total:
 *   classify → route(intended) → tone lint → Care Gate → finalise surface →
 *   strip financials → audit → emit.
 * A blocked event is still audited (with reasons) but never emitted.
 */
export class Pipeline {
  private alertCounters = new Map<string, DayCounter>();

  constructor(
    private readonly graph: Graph,
    private readonly audit: AuditLog,
    private readonly emit: (userId: string, moment: Moment) => void,
  ) {}

  process(event: RawEvent, now = new Date()): Moment | null {
    const user = this.graph.getUser(event.userId);
    if (!user) return null;

    const contentClass = classify(event.kind);
    const vertical = verticalFor(event.kind);
    const intended = intendedSurface(event.kind);

    // Reject dark-pattern copy up front — it can never become a moment.
    const tone = checkTone(event.title, event.body);
    if (!tone.ok) {
      return this.blocked(user.id, event, contentClass, [
        {
          code: 'CONTENT_DARK_PATTERN',
          message: `Rejected urgency/pressure language: "${tone.matched}".`,
        },
      ], now);
    }

    const boostCapReached =
      contentClass === 'inducement' ? this.graph.isBoostCapReached(user.id, event) : false;

    const decision = evaluate(user, contentClass, {
      now,
      intendedSurface: intended,
      dailyAlertCapReached: this.isPushCapReached(user.id, now),
      boostCapReached,
    });

    if (!decision.allowed) {
      return this.blocked(user.id, event, contentClass, decision.reasons, now);
    }

    const surface = finaliseSurface(event.kind, decision);
    if (surface === 'push') this.incrementPush(user.id, now);
    if (contentClass === 'inducement') this.graph.recordBoostDelivery(user.id, event);

    // No spend/loss ever reaches an ambient surface.
    const { data, stripped } = stripSensitiveFinancials(event.data, surface);
    const reasons: Reason[] = [...decision.reasons];
    if (stripped) {
      reasons.push({
        code: 'FINANCIALS_STRIPPED',
        message: 'Spend/loss data removed — ambient surfaces show status only.',
      });
    }

    let cta = event.cta;
    if (contentClass === 'informational' && cta && event.kind !== 'cashout_window') {
      cta = undefined;
      reasons.push({
        code: 'CTA_STRIPPED',
        message: 'Informational continuity only — promotional CTA removed.',
      });
    }

    const widgetFamily = surface === 'widget' ? widgetFamilyFor(event.kind) : undefined;

    const moment: Moment = {
      id: id('mom_'),
      userId: user.id,
      eventId: event.id,
      kind: event.kind,
      vertical,
      contentClass,
      surface,
      widgetFamily,
      cta,
      title: event.title,
      body: event.body,
      data,
      reasons,
      createdAt: now.toISOString(),
    };

    this.audit.record({
      id: id('aud_'),
      userId: user.id,
      eventId: event.id,
      kind: event.kind,
      vertical,
      contentClass,
      allowed: true,
      surface,
      widgetFamily,
      reasons,
      createdAt: now.toISOString(),
    });

    this.emit(user.id, moment);
    return moment;
  }

  private blocked(
    userId: string,
    event: RawEvent,
    contentClass: ReturnType<typeof classify>,
    reasons: Reason[],
    now: Date,
  ): null {
    this.audit.record({
      id: id('aud_'),
      userId,
      eventId: event.id,
      kind: event.kind,
      vertical: verticalFor(event.kind),
      contentClass,
      allowed: false,
      reasons,
      createdAt: now.toISOString(),
    });
    return null;
  }

  // --- push (alert) cap bookkeeping ---
  private dayKey(now: Date): string {
    return now.toISOString().slice(0, 10);
  }
  private counter(userId: string, now: Date): DayCounter {
    const today = this.dayKey(now);
    const existing = this.alertCounters.get(userId);
    if (existing && existing.day === today) return existing;
    const fresh: DayCounter = { day: today, pushes: 0 };
    this.alertCounters.set(userId, fresh);
    return fresh;
  }
  private isPushCapReached(userId: string, now: Date): boolean {
    return this.counter(userId, now).pushes >= config.DEFAULT_DAILY_ALERT_CAP;
  }
  private incrementPush(userId: string, now: Date): void {
    this.counter(userId, now).pushes += 1;
  }
}
