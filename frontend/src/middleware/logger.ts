import { defineMiddleware } from 'astro:middleware';
import { initializeLoggerFromEnv, logger } from '@/utils/logger';

// Generate unique ID for this worker instance
const WORKER_INSTANCE_ID = `worker-${Date.now()}`;

export const initLogger = defineMiddleware(async (context, next) => {
  if (context.locals.runtime?.env) {
    initializeLoggerFromEnv(context.locals.runtime.env);
  }

  logger.info('[PROXIMA] Worker instance:', { workerId: WORKER_INSTANCE_ID });

  return next();
});
