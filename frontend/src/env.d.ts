/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

type KVNamespace = import('@cloudflare/workers-types').KVNamespace;

interface ENV {
  THEME: KVNamespace;
  LOG_LEVEL?: string;
  STRUCTURED_LOGS?: string;
}

type Runtime = import('@astrojs/cloudflare').Runtime<ENV>;

declare namespace App {
  interface Locals extends Runtime {
    swell?: Swell;
    theme?: SwellTheme;
    params?: SwellData;
  }
}
