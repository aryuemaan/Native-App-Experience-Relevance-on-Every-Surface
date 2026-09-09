import type { AuditRecord } from './types';

/**
 * Decision log. Every Care Gate decision — allowed *and* suppressed — is
 * recorded here. This is what powers the "why am I seeing this?" provenance and
 * gives compliance a complete, replayable trail. Bounded ring buffer per user.
 */
export class AuditLog {
  private byUser = new Map<string, AuditRecord[]>();
  constructor(private readonly limit = 200) {}

  record(rec: AuditRecord): void {
    const list = this.byUser.get(rec.userId) ?? [];
    list.unshift(rec);
    if (list.length > this.limit) list.length = this.limit;
    this.byUser.set(rec.userId, list);
  }

  forUser(userId: string, limit = 50): AuditRecord[] {
    return (this.byUser.get(userId) ?? []).slice(0, limit);
  }
}
