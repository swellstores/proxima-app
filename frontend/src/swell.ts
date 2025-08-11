import {
  Swell,
  SwellTheme,
  type SwellAppConfig,
  type ShopifyCompatibility,
  type CFThemeEnv,
  type CFWorkerContext,
  type ThemeResources,
  type ThemeLookupResourceFactory,
  type SwellAppStorefrontThemeResources,
  type SwellAppShopifyCompatibilityConfig,
} from '@swell/apps-sdk';
import { AstroGlobal, APIContext, AstroCookieSetOptions } from 'astro';

import forms from '@/forms';
import { isResponseSent } from '@/utils/server';
import StorefrontShopifyCompatibility from '@/utils/shopify-compatibility';

import swellConfig from '../../swell.json';
import shopifyCompatibilityConfig from '../../shopify_compatibility.json';
import * as resources from '@/resources';

type ResourceType = typeof resources;
type ResourceKey = keyof ResourceType;

type LookupResourceType = {
  [K in keyof ResourceType]: ResourceType[K] extends ThemeLookupResourceFactory
    ? ResourceType[K]
    : never;
};

type LookupResourceKey = keyof LookupResourceType;

const SWELL_DATA_COOKIE = 'swell-data';

export function initSwell(
  context: AstroGlobal | APIContext,
  options?: Record<string, unknown>,
): Swell {
  const env = context.locals.runtime?.env;

  // Build logger config only if env vars are set
  const loggerConfig: any = {};
  if (env?.LOG_LEVEL) {
    loggerConfig.level = env.LOG_LEVEL;
  }
  if (env?.STRUCTURED_LOGS) {
    loggerConfig.structured = env.STRUCTURED_LOGS === 'true';
  }

  const swell = new Swell({
    url: context.url,
    // TODO: fix SwellAppShopifyCompatibilityConfig type in apps-sdk
    shopifyCompatibilityConfig:
      shopifyCompatibilityConfig as unknown as SwellAppShopifyCompatibilityConfig,
    config: swellConfig as SwellAppConfig,
    serverHeaders: context.request.headers,
    workerEnv: env as CFThemeEnv,
    workerCtx: context.locals.runtime?.ctx as CFWorkerContext,
    // Only pass logger config if we have any settings
    ...(Object.keys(loggerConfig).length > 0 && { logger: loggerConfig }),
    getCookie(name: string) {
      return getCookie(context, name);
    },
    setCookie(
      name: string,
      value: string,
      options?: AstroCookieSetOptions,
      swell?: Swell,
    ) {
      if (canUpdateCookies(context, swell)) {
        return setCookie(context, name, value, options);
      }
    },
    deleteCookie(name: string, options?: AstroCookieSetOptions, swell?: Swell) {
      if (canUpdateCookies(context, swell)) {
        return deleteCookie(context, name, options);
      }
    },
    ...options,
  });

  return swell;
}

export function canUpdateCookies(
  context: AstroGlobal | APIContext,
  swell?: Swell,
): boolean {
  return !(context as any).response && !swell?.sentResponse;
}

export function getSwellDataCookie(
  context: AstroGlobal | APIContext,
  defaultValue?: Record<string, unknown>,
): Record<string, unknown> | undefined {
  const swellCookie = context.cookies.get(SWELL_DATA_COOKIE)?.value;
  if (!swellCookie) {
    return defaultValue;
  }

  try {
    return JSON.parse(swellCookie);
  } catch {
    // noop
  }

  return defaultValue;
}

const defaultCookieOptions = {
  path: '/',
  samesite: 'lax',
};

export function updateSwellDataCookie(
  context: AstroGlobal | APIContext,
  value: string,
) {
  if (isResponseSent(context.request)) {
    return;
  }

  const swellData = getSwellDataCookie(context, {});
  const valueData = JSON.parse(value) || {};

  context.cookies.set(
    SWELL_DATA_COOKIE,
    { ...swellData, ...valueData },
    defaultCookieOptions,
  );
}

export function getCookie(
  context: AstroGlobal | APIContext,
  name: string,
): string | undefined {
  const swellCookie = getSwellDataCookie(context);

  if (swellCookie) {
    return (swellCookie[name] as string) || undefined;
  }

  return undefined;
}

export function setCookie(
  context: AstroGlobal | APIContext,
  name: string,
  value: string,
  options?: AstroCookieSetOptions,
): void {
  if (isResponseSent(context.request)) {
    return;
  }

  const cookieOptions = {
    ...defaultCookieOptions,
    ...options,
  };
  const swellCookie = getSwellDataCookie(context, {});

  if (swellCookie) {
    swellCookie[name] = value;
  }

  context.cookies.set(
    SWELL_DATA_COOKIE,
    JSON.stringify(swellCookie),
    cookieOptions,
  );
}

export function deleteCookie(
  context: AstroGlobal | APIContext,
  name: string,
  options?: AstroCookieSetOptions,
): void {
  const cookieOptions = {
    path: '/',
    samesite: 'lax',
    ...options,
  };
  const swellCookie = getSwellDataCookie(context, {});

  if (swellCookie) {
    delete swellCookie[name];
  }

  context.cookies.set(
    SWELL_DATA_COOKIE,
    JSON.stringify(swellCookie),
    cookieOptions,
  );
}

function loadResources<T extends ResourceKey>(
  resourceList: Record<string, T>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(resourceList).map(([key, resource]) => [
      key,
      resources[resource],
    ]),
  );
}

function getResources(
  resourcesConfig: SwellAppStorefrontThemeResources,
): ThemeResources {
  const { singletons, records } = resourcesConfig;

  return {
    singletons: loadResources(singletons as Record<string, ResourceKey>),
    records: loadResources(
      records as Record<string, LookupResourceKey>,
    ) as Record<string, ThemeLookupResourceFactory>,
  };
}

export function initTheme(swell: Swell): SwellTheme {
  return new SwellTheme(swell, {
    forms,
    resources: getResources(swellConfig.storefront.theme.resources),
    shopifyCompatibilityClass:
      StorefrontShopifyCompatibility as unknown as typeof ShopifyCompatibility,
  });
}

export async function initSwellTheme(
  Astro: AstroGlobal | APIContext,
): Promise<{ swell: Swell; theme: SwellTheme }> {
  const swell: Swell = Astro.locals.swell || (await initSwell(Astro));

  // Indicate response was sent to avoid mutating cookies
  if (Astro.locals.swell) {
    swell.sentResponse = true;
  }

  const theme: SwellTheme = Astro.locals.theme || initTheme(swell);

  return { swell, theme };
}
