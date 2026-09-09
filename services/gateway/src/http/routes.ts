import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { AuditLog } from '../domain/audit';
import { seedMatches } from '../data/matches';
import { gamingCatalog } from '../data/gaming';
import {
  gamingScenarios,
  makeBonusDrop,
  makeBoost,
  makeCashoutSettled,
  makePushyPromo,
  matchScenario,
  runScenario,
} from '../domain/feed';
import type { Graph } from '../domain/graph';
import type { Pipeline } from '../domain/pipeline';
import type { RawEvent } from '../domain/types';
import type { Hub } from '../stream/hub';

interface Deps {
  graph: Graph;
  pipeline: Pipeline;
  audit: AuditLog;
  hub: Hub;
}

export async function registerRoutes(app: FastifyInstance, deps: Deps): Promise<void> {
  const { graph, pipeline, audit, hub } = deps;
  const emit = (event: RawEvent) => pipeline.process(event);

  app.get('/health', async () => ({ status: 'ok', ts: new Date().toISOString() }));

  app.get('/api/matches', async () => seedMatches);

  app.get('/api/gaming/catalog', async () => gamingCatalog);

  // ---- Interest & Activity Graph -------------------------------------------
  app.get('/api/users', async () =>
    graph.listUsers().map((u) => ({ id: u.id, name: u.name })),
  );

  app.get('/api/users/:id/graph', async (req, reply) => {
    const { id } = req.params as { id: string };
    const u = graph.getUser(id);
    if (!u) return reply.code(404).send({ error: 'user not found' });
    return {
      id: u.id, name: u.name, account: u.account, follows: u.follows,
      favoriteSlots: u.favoriteSlots ?? [], followedTournaments: u.followedTournaments ?? [],
      liveDealerTables: u.liveDealerTables ?? [],
      tickets: u.tickets, rewards: u.rewards, boosts: u.boosts,
      consent: u.consent, rg: u.rg,
    };
  });

  // ---- Consent (GDPR / TCF) — granular, per surface ------------------------
  const surfacePatch = z
    .object({
      liveActivity: z.boolean(), widgets: z.boolean(), watch: z.boolean(),
      geolocation: z.boolean(), voice: z.boolean(),
    })
    .partial();
  const consentBody = z
    .object({
      personalisation: z.boolean(), marketing: z.boolean(), surfaces: surfacePatch,
    })
    .partial();
  app.put('/api/users/:id/consent', async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = consentBody.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() });
    if (!graph.getUser(id)) return reply.code(404).send({ error: 'user not found' });
    const u = graph.updateConsent(id, body.data);
    hub.broadcastToUser(id, 'consent', u.consent);
    return u.consent;
  });

  // ---- Responsible gaming ---------------------------------------------------
  const rgBody = z
    .object({
      selfExcluded: z.boolean(),
      riskLevel: z.enum(['none', 'elevated', 'high']),
      depositLimitReached: z.boolean(),
    })
    .partial();
  app.put('/api/users/:id/rg', async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = rgBody.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() });
    if (!graph.getUser(id)) return reply.code(404).send({ error: 'user not found' });
    const u = graph.updateRG(id, body.data);
    hub.broadcastToUser(id, 'rg', u.rg);
    return u.rg;
  });

  // ---- Account eligibility (KYC / age / market) ----------------------------
  const acctBody = z
    .object({ kycVerified: z.boolean(), ageVerified: z.boolean(), marketAllowed: z.boolean() })
    .partial();
  app.put('/api/users/:id/account', async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = acctBody.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() });
    if (!graph.getUser(id)) return reply.code(404).send({ error: 'user not found' });
    const u = graph.updateAccount(id, body.data);
    hub.broadcastToUser(id, 'account', u.account);
    return u.account;
  });

  // ---- Cash out (user-initiated, from a surface — no app launch) -----------
  app.post('/api/users/:id/cashout', async (req, reply) => {
    const { id } = req.params as { id: string };
    const { ticketId } = (req.body ?? {}) as { ticketId?: string };
    if (!graph.getUser(id)) return reply.code(404).send({ error: 'user not found' });
    const result = graph.cashout(id, ticketId);
    if (!result.ok) return reply.code(409).send({ ok: false, reason: result.reason });
    // Emit a settlement moment so every surface reflects the cash-out.
    const moment = pipeline.process(makeCashoutSettled(id, result.ticket!.liveValue));
    return { ok: true, ticket: result.ticket, moment };
  });

  // ---- Repeat last bet (convenience) — HARD RG guardrail -------------------
  app.post('/api/users/:id/repeat-bet', async (req, reply) => {
    const { id } = req.params as { id: string };
    if (!graph.getUser(id)) return reply.code(404).send({ error: 'user not found' });
    const check = graph.repeatBetAllowed(id);
    if (!check.allowed) return reply.code(403).send({ ok: false, reason: check.reason });
    return { ok: true };
  });

  // ---- Voice / Siri slip status --------------------------------------------
  app.get('/api/users/:id/slip', async (req, reply) => {
    const { id } = req.params as { id: string };
    const u = graph.getUser(id);
    if (!u) return reply.code(404).send({ error: 'user not found' });
    const open = u.tickets.find((t) => t.status === 'open' || t.status === 'cashout_available');
    const spoken = open
      ? `Your ${open.label} ticket is live and worth €${open.liveValue.toFixed(2)}.`
      : 'You have no open tickets right now.';
    return { spoken, ticket: open ?? null };
  });

  // ---- Geolocation context (device sends a DERIVED flag, never raw coords) --
  const geoBody = z.object({ context: z.enum(['near_shop', 'at_stadium']), fixtureId: z.string().optional() });
  app.post('/api/users/:id/context/location', async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = geoBody.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() });
    if (!graph.getUser(id)) return reply.code(404).send({ error: 'user not found' });
    const title = body.data.context === 'near_shop' ? 'You’re near a Fortuna shop' : 'Live at the match';
    const bodyText = body.data.context === 'near_shop'
      ? 'Quick action: scan a slip or check in-shop odds'
      : 'Quick action: follow this match live';
    const moment = pipeline.process({
      id: `evt_${Date.now()}`, userId: id, kind: 'geo_shortcut', title, body: bodyText,
      data: { context: body.data.context, fixtureId: body.data.fixtureId },
      fixtureId: body.data.fixtureId, priority: 0, createdAt: new Date().toISOString(),
    });
    return { delivered: Boolean(moment), moment };
  });

  // ---- Audit / provenance ---------------------------------------------------
  app.get('/api/users/:id/audit', async (req) => {
    const { id } = req.params as { id: string };
    return audit.forUser(id);
  });

  // ---- Demo control ---------------------------------------------------------
  const scenarios = new Map<string, () => void>();
  app.post('/api/demo/:id/scenario', async (req, reply) => {
    const { id } = req.params as { id: string };
    if (!graph.getUser(id)) return reply.code(404).send({ error: 'user not found' });
    scenarios.get(id)?.();
    scenarios.set(id, runScenario(id, matchScenario, graph, emit));
    return { started: true, steps: matchScenario.length };
  });

  app.post('/api/demo/:id/boost', async (req, reply) => {
    const { id } = req.params as { id: string };
    if (!graph.getUser(id)) return reply.code(404).send({ error: 'user not found' });
    const moment = pipeline.process(makeBoost(graph, id));
    return { delivered: Boolean(moment), moment };
  });

  app.post('/api/demo/:id/gaming', async (req, reply) => {
    const { id } = req.params as { id: string };
    if (!graph.getUser(id)) return reply.code(404).send({ error: 'user not found' });
    const { scenario } = (req.body ?? {}) as { scenario?: string };
    const steps = scenario ? gamingScenarios[scenario] : undefined;
    if (!steps) return reply.code(400).send({ error: 'unknown gaming scenario' });
    scenarios.get(`${id}:${scenario}`)?.();
    scenarios.set(`${id}:${scenario}`, runScenario(id, steps, graph, emit));
    return { started: true, scenario, steps: steps.length };
  });

  app.post('/api/demo/:id/bonus', async (req, reply) => {
    const { id } = req.params as { id: string };
    if (!graph.getUser(id)) return reply.code(404).send({ error: 'user not found' });
    const moment = pipeline.process(makeBonusDrop(id));
    return { delivered: Boolean(moment), moment };
  });

  // Fire an intentionally pushy promo — demonstrates the dark-pattern linter.
  app.post('/api/demo/:id/pushy-promo', async (req, reply) => {
    const { id } = req.params as { id: string };
    if (!graph.getUser(id)) return reply.code(404).send({ error: 'user not found' });
    const moment = pipeline.process(makePushyPromo(id));
    return { delivered: Boolean(moment), moment };
  });

  // ---- Streaming (surfaces connect here) ------------------------------------
  app.get('/stream', { websocket: true }, (socket, req) => {
    const url = new URL(req.url, 'http://localhost');
    const userId = url.searchParams.get('userId') ?? '';
    if (!graph.getUser(userId)) {
      socket.send(JSON.stringify({ type: 'error', message: 'unknown userId' }));
      socket.close();
      return;
    }
    hub.add(userId, socket);
    socket.send(JSON.stringify({ type: 'connected', userId }));
    socket.on('close', () => hub.remove(userId, socket));
  });
}
