import { defineMiddleware } from 'astro:middleware';
import type { APIContext, MiddlewareNext } from 'astro';
import { ContentCache } from '@swell/apps-sdk';
import { DYNAMIC_ASSET_URL } from '@/swell';
import {
  handleMiddlewareRequest,
  type SwellServerContext,
} from '@/utils/server';

interface CachedAsset {
  content: string;
  contentType: string;
}

interface AssetParams {
  asset_name: string;
  version?: string;
}

const CONTENT_TYPES: Record<string, string> = {
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.html': 'text/html',
};

const MAX_CACHE_SIZE = 5 * 1024 * 1024;
const MAX_VERSION_LENGTH = 64;
const ASSET_VERSION_PATTERN = /^\/assets\/v\/([^\/]+)\/(.+)$/;

let assetCache: ContentCache | null = null;

function getAssetCache(
  runtime: APIContext['locals']['runtime'],
): ContentCache | null {
  if (!runtime?.env?.THEME) {
    return null;
  }

  if (!assetCache) {
    assetCache = new ContentCache({
      kvStore: runtime.env.THEME,
      workerCtx: runtime.ctx,
    });
  }
  return assetCache;
}

function buildCacheKey(version: string, assetName: string): string {
  return `asset:${version}:${assetName}`;
}

export const assetCacheRead = defineMiddleware(
  async (context: APIContext, next: MiddlewareNext) => {
    if (
      context.request.method !== 'GET' ||
      !context.url.pathname.startsWith(`${DYNAMIC_ASSET_URL}v/`)
    ) {
      return next();
    }

    const match = context.url.pathname.match(ASSET_VERSION_PATTERN);
    if (!match) {
      return next();
    }

    const [, version, assetName] = match;

    if (version.length > MAX_VERSION_LENGTH) {
      return new Response('Invalid version', { status: 400 });
    }

    const cache = getAssetCache(context.locals.runtime);
    if (!cache) {
      return next();
    }

    try {
      const cached = await cache.get<CachedAsset>(
        buildCacheKey(version, assetName),
      );

      if (cached) {
        return new Response(cached.content, {
          status: 200,
          headers: {
            'Content-Type': cached.contentType,
            'Cache-Control': 'public, max-age=31536000, immutable',
            'X-Cache-Status': 'HIT',
          },
        });
      }
    } catch {
      // Fallback to rendering on cache error
    }

    return next();
  },
);

export const assetRender = handleMiddlewareRequest<AssetParams>(
  'GET',
  [
    `${DYNAMIC_ASSET_URL}v/:version/:asset_name`,
    `${DYNAMIC_ASSET_URL}:asset_name`,
  ],
  async ({ theme, params, context }: SwellServerContext<AssetParams>) => {
    const { asset_name, version } = params;

    try {
      await theme.themeLoader.init();

      const config = await theme.getAssetConfig(asset_name);

      if (!config) {
        return new Response(`Asset config not found: ${asset_name}`, {
          status: 404,
        });
      }

      const settingsConfig = await theme.getThemeTemplateConfigByType(
        'config',
        'settings_data',
        'json',
      );
      const settings = JSON.parse(settingsConfig?.file_data);

      const content = await theme.renderTemplateString(config.file_data || '', {
        settings: settings.current,
      });
      const contentType = getContentType(asset_name);

      if (version && content.length <= MAX_CACHE_SIZE) {
        const cache = getAssetCache(context.locals.runtime);
        const ctx = context.locals.runtime?.ctx;

        if (cache && ctx?.waitUntil) {
          ctx.waitUntil(
            cache
              .set(buildCacheKey(version, asset_name), { content, contentType })
              .catch(() => {
                // Silent fail for cache write errors
              }),
          );
        }
      }

      return new Response(content, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Cache-Control': version
            ? 'public, max-age=31536000, immutable'
            : 'no-cache',
          'X-Cache-Status': version ? 'MISS' : 'DYNAMIC',
        },
      });
    } catch (error) {
      console.error(`Failed to render asset: ${asset_name}`, error);

      return new Response('Internal Server Error', { status: 500 });
    }
  },
);

function getContentType(assetName: string): string {
  const assetFileName = assetName.replace(/\.liquid$/, '');

  for (const [ext, type] of Object.entries(CONTENT_TYPES)) {
    if (assetFileName.endsWith(ext)) {
      return type;
    }
  }

  return 'text/plain';
}

export default [assetCacheRead, assetRender];
