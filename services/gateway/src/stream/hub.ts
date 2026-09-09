import type { WebSocket } from '@fastify/websocket';
import type { Moment } from '../domain/types';

/**
 * Connection registry. Surfaces (a phone, a watch, the web demo) connect over
 * WebSocket with ?userId=..., and receive only that user's gated moments —
 * the followed-only fan-out, after the Care Gate.
 */
export class Hub {
  private sockets = new Map<string, Set<WebSocket>>();

  add(userId: string, socket: WebSocket): void {
    const set = this.sockets.get(userId) ?? new Set();
    set.add(socket);
    this.sockets.set(userId, set);
  }

  remove(userId: string, socket: WebSocket): void {
    this.sockets.get(userId)?.delete(socket);
  }

  count(userId: string): number {
    return this.sockets.get(userId)?.size ?? 0;
  }

  send(userId: string, moment: Moment): void {
    const set = this.sockets.get(userId);
    if (!set) return;
    const payload = JSON.stringify({ type: 'moment', moment });
    for (const s of set) {
      if (s.readyState === s.OPEN) s.send(payload);
    }
  }

  broadcastToUser(userId: string, type: string, data: unknown): void {
    const set = this.sockets.get(userId);
    if (!set) return;
    const payload = JSON.stringify({ type, data });
    for (const s of set) if (s.readyState === s.OPEN) s.send(payload);
  }
}
