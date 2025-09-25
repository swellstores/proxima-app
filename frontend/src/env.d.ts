/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

type KVNamespace = import('@cloudflare/workers-types').KVNamespace;

interface ENV {
  THEME: KVNamespace;
  LOG_LEVEL?: string;
  STRUCTURED_LOGS?: string;
  HTML_CACHE?: boolean | string;
  HTML_CACHE_BACKEND?: 'kv' | 'worker';
  CF_VERSION_METADATA?: {
    id: string;
    tag: string;
    timestamp: string;
  };
}

type Runtime = import('@astrojs/cloudflare').Runtime<ENV>;

declare namespace App {
  interface Locals extends Runtime {
    swell?: Swell;
    theme?: SwellTheme;
    params?: SwellData;
  }
}
