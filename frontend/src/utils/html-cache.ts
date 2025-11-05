import {
  getHtmlCache,
  DEFAULT_CACHE_RULES,
  type CacheRules,
  type HtmlCache,
  type HtmlCacheEnv,
} from '@swell/apps-sdk';

import type { APIContext } from 'astro';

export function createHtmlCache(context: APIContext): HtmlCache | null {
  const versionMetadata = context.locals.runtime?.env?.CF_VERSION_METADATA;
  const customEpoch = context.locals.runtime?.env?.HTML_CACHE_EPOCH;
  const epoch = versionMetadata?.id || customEpoch || 'default';

  const runtime = context.locals.runtime;
  const environment: HtmlCacheEnv = {
    NAMESPACE: runtime?.env?.THEME,
    HTML_CACHE_EPOCH: epoch,
    HTML_CACHE_BACKEND: runtime?.env?.HTML_CACHE_BACKEND || 'kv',
  };

  const cacheRules: CacheRules = {
    ...DEFAULT_CACHE_RULES,
    pathRules: [
      ...(DEFAULT_CACHE_RULES.pathRules || []),
      { path: '/account', skip: true },
      {
        path: '/sitemap*',
        contentTypes: ['application/xml'],
        ttl: 24 * 60 * 60, // 1 day
        swr: 23 * 60 * 60, // 23 hours
      },
    ],
  };

  return getHtmlCache(environment, cacheRules);
}
