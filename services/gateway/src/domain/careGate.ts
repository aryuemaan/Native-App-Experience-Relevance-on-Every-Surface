import type { ContentClass, Decision, Reason, Surface, User } from './types';

/**
 * THE CARE GATE — the single compliance kernel every candidate render passes
 * through. Nothing reaches a surface except via `evaluate`.
 *
 * Order of checks (each a hard gate, enforced in code — not downstream policy):
 *   0. Eligibility — KYC / age / market. If unverified, NO surface may exist.
 *   1. Personalisation consent — gates every personalised surface.
 *   2. Per-surface consent — granular opt-in; the intended surface must be on.
 *   3. Inducement gating — the boost class is blocked for:
 *        no marketing consent · self-excluded · high-risk · deposit-limit-reached
 *        · weekly frequency cap reached.
 *   4. Quiet hours & daily alert cap — downgrade `push` to a silent surface.
 *
 * The decision carries a human-readable `reasons` trail powering the audit log
 * and the in-product "why am I seeing this?" provenance.
 */

export interface CareGateContext {
  now: Date;
  /** Surface the Moment Router intends to use (drives per-surface consent). */
  intendedSurface: Surface;
  /** Push (alerting) cap already reached today? */
  dailyAlertCapReached: boolean;
  /** For inducements: has the boost's weekly cap been reached? */
  boostCapReached?: boolean;
}

function reason(code: Reason['code'], message: string): Reason {
  return { code, message };
}

export function isWithinQuietHours(user: User, now: Date): boolean {
  const local = new Date(now.getTime() + user.timezoneOffsetMinutes * 60_000);
  const minutes = local.getUTCHours() * 60 + local.getUTCMinutes();
  const [sh, sm] = user.rg.quietHours.start.split(':').map(Number);
  const [eh, em] = user.rg.quietHours.end.split(':').map(Number);
  const start = (sh ?? 0) * 60 + (sm ?? 0);
  const end = (eh ?? 0) * 60 + (em ?? 0);
  if (start === end) return false;
  return start < end ? minutes >= start && minutes < end : minutes >= start || minutes < end;
}

/** Does this surface require a specific per-surface consent to be on? */
function surfaceConsentOk(user: User, surface: Surface): boolean {
  const s = user.consent.surfaces;
  switch (surface) {
    case 'live_activity':
    case 'dynamic_island':
      return s.liveActivity;
    case 'widget':
      return s.widgets;
    case 'watch':
      return s.watch;
    case 'quick_action':
      return s.geolocation;
    case 'push':
      return true; // push governed by quiet hours + caps, not a surface toggle
    default:
      return true;
  }
}

export function evaluate(
  user: User,
  contentClass: ContentClass,
  ctx: CareGateContext,
): Decision {
  const reasons: Reason[] = [];
  const block = (): Decision => ({ allowed: false, contentClass, alertingAllowed: false, reasons });

  // (0) Eligibility — the surface literally cannot exist for an unverified account.
  const a = user.account;
  if (!a.kycVerified || !a.ageVerified || !a.marketAllowed) {
    reasons.push(
      reason('ELIGIBILITY_NOT_VERIFIED', 'Account not KYC/age/market verified — no surface exists.'),
    );
    return block();
  }

  // (1) Personalisation consent gates every ambient surface.
  if (!user.consent.personalisation) {
    reasons.push(
      reason('CONSENT_PERSONALISATION_MISSING', 'No personalisation consent — nothing renders.'),
    );
    return block();
  }

  // (2) Per-surface granular consent.
  if (!surfaceConsentOk(user, ctx.intendedSurface)) {
    reasons.push(
      reason('CONSENT_SURFACE_OFF', `The "${ctx.intendedSurface}" surface is switched off by the user.`),
    );
    return block();
  }

  // (3) The inducement class is hard-gated for protected cohorts.
  if (contentClass === 'inducement') {
    if (!user.consent.marketing)
      reasons.push(reason('CONSENT_MARKETING_MISSING', 'Marketing consent not granted — boost blocked.'));
    if (user.rg.selfExcluded)
      reasons.push(reason('RG_SELF_EXCLUDED', 'User is self-excluded — boost blocked.'));
    if (user.rg.riskLevel === 'high')
      reasons.push(reason('RG_AT_RISK', 'User flagged high-risk — boost blocked.'));
    if (user.rg.depositLimitReached)
      reasons.push(reason('RG_DEPOSIT_LIMIT_REACHED', 'Deposit/spend limit reached — boost blocked.'));
    if (ctx.boostCapReached)
      reasons.push(reason('BOOST_WEEKLY_CAP_REACHED', 'Weekly boost frequency cap reached — blocked.'));
    if (reasons.length > 0) return block();
    reasons.push(
      reason('ALLOWED_MARKETING_CONSENTED', 'Marketing consented, RG-clear and within cap — boost permitted.'),
    );
  } else {
    reasons.push(
      reason('ALLOWED_INFORMATIONAL', "Informational content the user already follows or holds."),
    );
  }

  // (4) Quiet hours & caps constrain the interruptive surface only.
  let alertingAllowed = true;
  if (isWithinQuietHours(user, ctx.now)) {
    alertingAllowed = false;
    reasons.push(reason('QUIET_HOURS', 'Inside quiet hours — no interruptive push.'));
  }
  if (ctx.dailyAlertCapReached) {
    alertingAllowed = false;
    reasons.push(reason('DAILY_ALERT_CAP_REACHED', 'Daily push cap reached — no further pushes today.'));
  }
  if (!alertingAllowed && ctx.intendedSurface === 'push') {
    reasons.push(reason('DOWNGRADED_TO_SILENT', 'Delivered on a silent, ambient surface instead.'));
  }

  return { allowed: true, contentClass, alertingAllowed, reasons };
}
