import type { Surface } from './types';

/**
 * NO DARK PATTERNS.
 *
 * Ambient surfaces show status — never urgency language, countdown pressure or
 * loss-chasing framing. This is what separates FEG Pulse from the gambling-harm
 * patterns regulators explicitly flag. Any content whose copy trips the linter
 * is rejected before it can become a moment (see the pipeline).
 */
const URGENCY_PATTERNS: RegExp[] = [
  /\bhurry\b/i,
  /\blast chance\b/i,
  /\bdon'?t miss\b/i,
  /\bact now\b/i,
  /\bnow or never\b/i,
  /\bfinal call\b/i,
  /\blimited[- ]time\b/i,
  /\bending (soon|tonight|now)\b/i,
  /\bexpires? (soon|now|in \d+)\b/i,
  /\bonly \d+ (minutes?|seconds?|hours?) (left|remaining)\b/i,
  /\byou'?re about to lose\b/i,
  /\bwin (it )?back\b/i,
  /\bchase your loss(es)?\b/i,
  /\b\d+:\d{2}\s*(left|remaining)\b/i, // countdown timer
];

export interface ToneResult {
  ok: boolean;
  matched?: string;
}

export function checkTone(...parts: string[]): ToneResult {
  const text = parts.join(' ');
  for (const rx of URGENCY_PATTERNS) {
    const m = rx.exec(text);
    if (m) return { ok: false, matched: m[0] };
  }
  return { ok: true };
}

/**
 * NO SPEND / LOSS ON AMBIENT SURFACES.
 *
 * Lock screen and watch never normalise loss-chasing visibility — only slip
 * status, score and cash-out value (money you'd receive) may appear. Any
 * spend/loss field is stripped from the payload before it reaches a surface.
 */
const FORBIDDEN_FINANCIAL_KEYS = [
  'loss',
  'losses',
  'netLoss',
  'spend',
  'spent',
  'deposited',
  'deposit',
  'balance',
  'wagered',
];

export function stripSensitiveFinancials(
  data: Record<string, unknown>,
  _surface: Surface,
): { data: Record<string, unknown>; stripped: boolean } {
  let stripped = false;
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (FORBIDDEN_FINANCIAL_KEYS.includes(k)) {
      stripped = true;
      continue;
    }
    clean[k] = v;
  }
  return { data: clean, stripped };
}
