import {
  Swell,
  SwellTheme,
  SwellAppConfig,
  ShopifyCompatibility,
  CFThemeEnv,
  ThemeResources,
  ThemeLookupResourceFactory,
  SwellAppStorefrontThemeResources,
  SwellAppShopifyCompatibilityConfig,
} from '@swell/apps-sdk';
import { AstroGlobal, APIContext, AstroCookieSetOptions } from 'astro';

import forms from '@/forms';
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

export async function initSwell(
  context: AstroGlobal | APIContext,
  options?: Record<string, any>,
): Promise<Swell> {
  const swell = new Swell({
    url: context.url,
    // TODO: fix SwellAppShopifyCompatibilityConfig type in apps-sdk
    shopifyCompatibilityConfig:
      shopifyCompatibilityConfig as unknown as SwellAppShopifyCompatibilityConfig,
    config: swellConfig as SwellAppConfig,
    serverHeaders: context.request.headers,
    workerEnv: context.locals.runtime?.env as CFThemeEnv,
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

  await swell.updateCacheModified(
    context.request.headers.get('swell-cache-modified') ?? '',
  );

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
  defaultValue?: object,
) {
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
  const swellData = getSwellDataCookie(context, {});
  const valueData = JSON.parse(value) || {};

  context.cookies.set(
    SWELL_DATA_COOKIE,
    { ...swellData, ...valueData },
    defaultCookieOptions,
  );
}

export function getCookie(context: AstroGlobal | APIContext, name: string) {
  const swellCookie = getSwellDataCookie(context);
  return swellCookie?.[name] || undefined;
}

export function setCookie(
  context: AstroGlobal | APIContext,
  name: string,
  value: string,
  options?: AstroCookieSetOptions,
): void {
  const cookieOptions = {
    ...defaultCookieOptions,
    ...options,
  };
  const swellCookie = getSwellDataCookie(context, {});

  swellCookie[name] = value;
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

  delete swellCookie[name];
  context.cookies.set(
    SWELL_DATA_COOKIE,
    JSON.stringify(swellCookie),
    cookieOptions,
  );
}

function loadResources<T extends ResourceKey>(resourceList: Record<string, T>) {
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

export async function ensureStorefrontLocalization(
  swell: Swell,
  context: AstroGlobal | APIContext,
) {
  const store = await swell.storefront.settings.get('store');
  const { locale: currentLocale, currency: currentCurrency } =
    swell.getStorefrontLocalization();
  const swellData = getSwellDataCookie(context);
  const cookieLocale = swellData?.['swell-locale'];
  const cookieCurrency = swellData?.['swell-currency'];
  const locale =
    typeof cookieLocale === 'string' ? cookieLocale : store.locale || 'en-US';
  const currency =
    typeof cookieCurrency === 'string'
      ? cookieCurrency
      : store.currency || 'USD';

  if (typeof locale === 'string' && locale !== currentLocale) {
    await swell.storefront.locale.select(locale);
  }

  if (typeof currency === 'string' && currency !== currentCurrency) {
    await swell.storefront.currency.select(currency);
  }
}

export async function initSwellTheme(
  Astro: AstroGlobal | APIContext,
  pageId?: string,
): Promise<{ swell: Swell; theme: SwellTheme }> {
  const swell = Astro.locals.swell || (await initSwell(Astro));

  await ensureStorefrontLocalization(swell, Astro);

  // Indicate response was sent to avoid mutating cookies
  if (Astro.locals.swell) {
    swell.sentResponse = true;
  }

  const theme = Astro.locals.theme || initTheme(swell);

  if (!theme.pageId) {
    await theme.initGlobals(pageId);
  }

  return { swell, theme };
}
