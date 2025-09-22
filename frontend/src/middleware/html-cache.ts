import { defineMiddleware } from 'astro:middleware';
import { getHtmlCache, DEFAULT_CACHE_RULES, type HtmlCacheEnv, type CacheRules } from '@swell/apps-sdk';
import { logger } from '@/utils/logger';

export const htmlCacheMiddleware = defineMiddleware(async (context, next) => {
  // Check if HTML caching is enabled
  const htmlCacheEnabled = context.locals.runtime?.env?.HTML_CACHE;

  if (!htmlCacheEnabled) {
    return next();
  }

  const versionMetadata = context.locals.runtime?.env?.CF_VERSION_METADATA;
  const epoch = versionMetadata?.id || "default";

  logger.info('[SDK Html-cache] Using epoch:', { epoch });

  const runtime = context.locals.runtime;
  const environment: HtmlCacheEnv = {
    NAMESPACE: runtime?.env?.THEME,
    HTML_CACHE_EPOCH: epoch,
    HTML_CACHE_BACKEND:
      (runtime?.env?.HTML_CACHE_BACKEND as 'kv' | 'worker' | undefined) || 'kv',
  };

  const cacheRules: CacheRules = {
    ...DEFAULT_CACHE_RULES,
    pathRules: [
      ...DEFAULT_CACHE_RULES.pathRules || [],
      { path: '/account', skip: true }
    ]
  };

  const htmlCache = getHtmlCache(environment, cacheRules);
  if (!htmlCache) return next();

  const isRevalidation =
    context.request.headers.get('X-Cache-Bypass') === 'revalidation';
  const method = context.request.method.toUpperCase();

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

  // Helpers
  const stripEnc = (h: Headers) => {
    h.delete('content-encoding');
    h.delete('Content-Encoding');
    h.delete('content-length');
    h.delete('Content-Length');
  };

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
