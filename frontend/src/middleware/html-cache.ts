import { defineMiddleware } from 'astro:middleware';

import { logger } from '@/utils/logger';
import { createHtmlCache } from '@/utils/html-cache';

export const htmlCacheMiddleware = defineMiddleware(async (context, next) => {
  // Check if HTML caching is enabled
  const htmlCacheEnabled = context.locals.runtime?.env?.HTML_CACHE;

  if (!htmlCacheEnabled) {
    return next();
  }

  const htmlCache = createHtmlCache(context);
  if (!htmlCache) return next();

  const isRevalidation =
    context.request.headers.get('X-Cache-Bypass') === 'revalidation';
  const method = context.request.method.toUpperCase();

  const storefrontId = context.request.headers.get('swell-storefront-id');
  const themeVersionHash = context.request.headers.get(
    'swell-theme-version-hash',
  );
  logger.info('[SDK Html-cache] cache values:', {
    storefrontId,
    themeVersionHash,
    isRevalidation,
    // @ts-expect-error protected epoch
    epoch: htmlCache.epoch,
  });

  // ---- READ PATH ----
  if (!isRevalidation && htmlCache.canReadFromCache(context.request)) {
    const cached = await htmlCache.getWithConditionals(context.request);

    if (cached?.found === true) {
      // Return 304 if conditional match
      if (cached.notModified && cached.conditional304) {
        return cached.conditional304;
      }

      if (cached.response) {
        // HEAD should only return headers
        if (method === 'HEAD') {
          return new Response(null, {
            status: cached.response.status,
            statusText: cached.response.statusText,
            headers: cached.response.headers,
          });
        }

        // Trigger background revalidation if stale
        if (cached.stale === true) {
          const ctx = context.locals.runtime?.ctx;
          if (ctx && typeof ctx.waitUntil === 'function') {
            const revalidateRequest = htmlCache.createRevalidationRequest(
              context.request,
            );
            ctx.waitUntil(
              fetch(revalidateRequest, {
                // @ts-expect-error cf is a Cloudflare Workers specific extension
                cf: { cacheTtl: 0, cacheEverything: false },
              }).catch((err) => {
                logger.warn('[SDK Html-cache] revalidate fetch failed', {
                  error: String(err),
                });
              }),
            );
          }
        }

        return cached.response;
      }
    }
  }

  // ---- MISS PATH ----
  const response = await next();

  if (htmlCache.canWriteToCache(context.request, response)) {
    // Buffer once
    const bodyText = await response.text();

    // Client response
    const clientHeaders = new Headers(response.headers);
    stripEnc(clientHeaders);
    const responseToReturn = new Response(bodyText, {
      status: response.status,
      statusText: response.statusText,
      headers: clientHeaders,
    });

    // Background cache write
    const ctx = context.locals.runtime?.ctx;
    if (ctx && typeof ctx.waitUntil === 'function') {
      const cacheHeaders = new Headers(response.headers);
      stripEnc(cacheHeaders);
      const responseToCache = new Response(bodyText, {
        status: response.status,
        statusText: response.statusText,
        headers: cacheHeaders,
      });
      ctx.waitUntil(htmlCache.put(context.request, responseToCache));
    }

    responseToReturn.headers.set(
      'X-Cache-Status',
      isRevalidation ? 'REVALIDATED' : 'MISS',
    );
    return responseToReturn;
  }

  // Not cacheable: return as-is, but tag status
  response.headers.set(
    'X-Cache-Status',
    isRevalidation ? 'REVALIDATED' : 'MISS',
  );
  return response;
});

// Helpers
function stripEnc(h: Headers) {
  h.delete('content-encoding');
  h.delete('content-length');
}
