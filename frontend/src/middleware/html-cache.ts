import { defineMiddleware } from 'astro:middleware';
import { WorkerHtmlCache, type CacheResult } from '@swell/apps-sdk';
import { logger } from '@/utils/logger';

export const htmlCacheMiddleware = defineMiddleware(async (context, next) => {
  // Ensure HTML_CACHE_EPOCH is set
  const epoch = context.locals.runtime?.env?.HTML_CACHE_EPOCH;

  if (typeof epoch !== 'string' || !epoch) {
    return next();
  }

  const htmlCache = new WorkerHtmlCache(epoch);
  const isRevalidation =
    context.request.headers.get('X-Cache-Bypass') === 'revalidation';

  if (!isRevalidation) {
    const cached = await htmlCache.getWithConditionals(context.request);

    if (cached?.found === true) {
      // Handle 304 responses (already checked by SDK)
      if (cached.notModified && cached.conditional304) {
        return cached.conditional304;
      }

      if (cached.response) {
        // Handle stale revalidation
        if (cached.stale === true) {
          const waitUntil = context.locals.runtime?.ctx?.waitUntil;
          // Check if env supports waitUntil (Cloudflare Workers)
          if (typeof waitUntil === 'function') {
            const revalidateRequest = htmlCache.createRevalidationRequest(
              context.request,
            );
            // Fire the request with Edge CDN bypass
            waitUntil(
              fetch(revalidateRequest, {
                cf: {
                  cacheTtl: 0, // Don't cache this request at Edge
                  cacheEverything: false, // Don't force caching of non-cacheable responses
                },
              }),
            );
          }
        }

        return cached.response;
      }
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
