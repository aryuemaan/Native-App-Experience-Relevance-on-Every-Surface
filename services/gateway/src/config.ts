import { z } from 'zod';

/**
 * All runtime configuration is validated at boot. A missing or malformed
 * variable fails fast rather than surfacing as a mysterious runtime error.
 */
const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().positive().default(8080),
  /** Comma-separated list, or "*" for any origin (demo default). */
  CORS_ORIGIN: z.string().default('*'),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
    .default('info'),
  /** Default per-surface, per-day alert cap applied by the Moment Router. */
  DEFAULT_DAILY_ALERT_CAP: z.coerce.number().int().positive().default(6),
});

export const config = EnvSchema.parse(process.env);
export type Config = z.infer<typeof EnvSchema>;
