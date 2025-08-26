import { defineMiddleware } from 'astro:middleware';
import { initializeLoggerFromEnv, logger } from '@/utils/logger';

// Generate unique ID for this worker instance
const WORKER_INSTANCE_ID = (Math.random() + 1).toString(36).substring(7);

// Initialize logger from environment variables
export const initLogger = defineMiddleware(async (context, next) => {
  // Initialize logger with env vars if available
  if (context.locals.runtime?.env) {
    initializeLoggerFromEnv(context.locals.runtime.env);
  }

  logger.info('[PROXIMA] Worker instance:', {
    workerId: WORKER_INSTANCE_ID,
  });

  return next();
});
