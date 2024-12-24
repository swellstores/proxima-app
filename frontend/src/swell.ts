import {
  Swell,
  SwellTheme,
  SwellAppConfig,
  ShopifyCompatibility,
  CFThemeEnv,
  ThemeResources,
  SwellAppStorefrontThemeResources,
} from '@swell/apps-sdk';
import { AstroGlobal, APIContext, AstroCookieSetOptions } from 'astro';

import forms from '@/forms';
import StorefrontShopifyCompatibility from '@/utils/shopify-compatibility';

import swellConfig from '../../swell.json';
import shopifyCompatibilityConfig from '../../shopify_compatibility.json';
import * as resources from '@/resources';

export async function initSwell(
  context: AstroGlobal | APIContext,
  options?: { [key: string]: any },
): Promise<Swell> {
  const swell = new Swell({
    url: context.url,
    shopifyCompatibilityConfig,
    config: swellConfig as SwellAppConfig,
    serverHeaders: context.request.headers,
    workerEnv: context.locals.runtime?.env as CFThemeEnv,
    getCookie: (name: string) => {
      return getCookie(context, name);
    },
    setCookie: (
      name: string,
      value: string,
      options?: AstroCookieSetOptions,
      swell?: Swell,
    ) => {
      if (canUpdateCookies(context, swell)) {
        return setCookie(context, name, value, options);
      }
    },
    deleteCookie: (
      name: string,
      options?: AstroCookieSetOptions,
      swell?: Swell,
    ) => {
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
) {
  return !(context as any).response && !swell?.sentResponse;
}

export function getCookie(context: AstroGlobal | APIContext, name: string) {
  const swellCookie = context.cookies.get('swell-data')?.value;
  if (!swellCookie) {
    return undefined;
  }
  const cookieValue = JSON.parse(swellCookie);
  return cookieValue[name] || undefined;
}

export function setCookie(
  context: AstroGlobal | APIContext,
  name: string,
  value: string,
  options?: AstroCookieSetOptions,
) {
  const cookieOptions = {
    path: '/',
    samesite: 'lax',
    ...options,
  };
  const swellCookie = context.cookies.get('swell-data')?.value;
  const cookieValue = swellCookie ? JSON.parse(swellCookie) : {};
  cookieValue[name] = value;
  context.cookies.set('swell-data', JSON.stringify(cookieValue), cookieOptions);
}

export function deleteCookie(
  context: AstroGlobal | APIContext,
  name: string,
  options?: AstroCookieSetOptions,
) {
  const cookieOptions = {
    path: '/',
    samesite: 'lax',
    ...options,
  };
  const swellCookie = context.cookies.get('swell-data')?.value;
  if (!swellCookie) { 
    return;
  }
  const cookieValue = JSON.parse(swellCookie);
  delete cookieValue[name];
  context.cookies.set('swell-data', JSON.stringify(cookieValue), cookieOptions);
}

function getResources(
  resourcesConfig: SwellAppStorefrontThemeResources,
): ThemeResources {
  const { singletons, records } = resourcesConfig;

  const loadResources = (resourceList: Record<string, string>) =>
    Object.fromEntries(
      Object.entries(resourceList).map(([key, resource]) => [
        key,
        resources[resource],
      ]),
    );

  return {
    singletons: loadResources(singletons),
    records: loadResources(records),
  };
}

export function initTheme(swell: Swell) {
  return new SwellTheme(swell, {
    forms,
    resources: getResources(swellConfig.storefront.theme.resources),
    shopifyCompatibilityClass:
      StorefrontShopifyCompatibility as unknown as typeof ShopifyCompatibility,
  });
}

export async function initSwellTheme(
  Astro: AstroGlobal | APIContext,
  pageId?: string,
) {
  const swell = Astro.locals.swell || (await initSwell(Astro));

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
