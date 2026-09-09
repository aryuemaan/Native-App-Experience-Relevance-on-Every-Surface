import { config } from './config';
import { logger } from './logger';
import { buildServer } from './server';

async function main(): Promise<void> {
  const app = await buildServer();
  await app.listen({ host: config.HOST, port: config.PORT });
  logger.info(`Fortuna Pulse gateway listening on http://${config.HOST}:${config.PORT}`);
}

main().catch((err) => {
  logger.error(err);
  process.exit(1);
});

// Graceful shutdown for container orchestrators.
for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, () => {
    logger.info(`received ${sig}, shutting down`);
    process.exit(0);
  });
}
