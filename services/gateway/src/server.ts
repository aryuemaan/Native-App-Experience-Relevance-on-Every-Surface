import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import Fastify, { type FastifyInstance } from 'fastify';
import { config } from './config';
import { AuditLog } from './domain/audit';
import { Graph } from './domain/graph';
import { Pipeline } from './domain/pipeline';
import { registerRoutes } from './http/routes';
import { Hub } from './stream/hub';

export async function buildServer(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: config.LOG_LEVEL,
      transport:
        config.NODE_ENV === 'development'
          ? { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' } }
          : undefined,
    },
  });

  await app.register(cors, {
    origin: config.CORS_ORIGIN === '*' ? true : config.CORS_ORIGIN.split(','),
  });
  await app.register(websocket);

  const graph = new Graph();
  const audit = new AuditLog();
  const hub = new Hub();
  const pipeline = new Pipeline(graph, audit, (userId, moment) => hub.send(userId, moment));

  await registerRoutes(app, { graph, pipeline, audit, hub });

  return app;
}
