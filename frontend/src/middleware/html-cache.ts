import { defineMiddleware } from 'astro:middleware';
import { WorkerHtmlCache, type CacheResult } from '@swell/apps-sdk';
import { logger } from '@/utils/logger';

export const htmlCacheMiddleware = defineMiddleware(async (context, next) => {
  const epoch = context.locals.runtime?.env?.HTML_CACHE_EPOCH;

  if (typeof epoch !== 'string' || !epoch) {
    return next();
  }

  const htmlCache = new WorkerHtmlCache(epoch);
  const isRevalidation =
    context.request.headers.get('X-Cache-Bypass') === 'revalidation';

  // Try cache if not a revalidation request
  // For middleware with SWR pattern
  if (!isRevalidation) {
    let cached: CacheResult | null = null;

    try {
      cached = await htmlCache.get(context.request);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
    }

    if (cached?.found === true && cached.response) {
      if (cached.stale === true) {
        // Revalidation
        const waitUntil = context.locals.runtime?.ctx?.waitUntil;
        // Check if env supports waitUntil (Cloudflare Workers)
        if (typeof waitUntil === 'function') {
          const revalidateHeaders = new Headers(context.request.headers);
          revalidateHeaders.set('X-Cache-Bypass', 'revalidation');

          const revalidateRequest = new Request(context.request.url, {
            method: context.request.method,
            headers: revalidateHeaders,
          });

          // Just fire the request, don't handle response - the revalidation worker will cache it
          waitUntil(fetch(revalidateRequest));
        }
      }

      return cached.response;
    }
  }

  // Generate fresh response (either cache miss or revalidation)
  const response = await next();

  if (response.ok) {
    try {
      await htmlCache.put(context.request, response.clone());
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.warn('[PROXIMA] Html-cache put failed:', { errorMessage });
    }
  }

  response.headers.set(
    'X-Cache-Status',
    isRevalidation ? 'REVALIDATED' : 'MISS',
  );

  return response;
});
