import { Swell, SwellTheme } from '@swell/apps-sdk';
import { AstroGlobal, APIContext, AstroCookieSetOptions } from 'astro';
import forms from '@/forms';
import resources from '@/resources';
import StorefrontShopifyCompatibility from '@/utils/shopify-compatibility';
import swellConfig from '../../swell.json';

export function initSwell(
  context: AstroGlobal | APIContext,
  options?: { [key: string]: any },
) {
  return new Swell({
    url: context.url,
    config: swellConfig,
    serverHeaders: context.request.headers,
    workerEnv: context.locals.runtime?.env,
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
}

export function canUpdateCookies(
  context: AstroGlobal | APIContext,
  swell?: Swell,
) {
  return !(context as any).response && !swell?.sentResponse;
}

export function getCookie(context: AstroGlobal | APIContext, name: string) {
  return context.cookies.get(name)?.value;
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
  context.cookies.set(name, value, cookieOptions);
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
  context.cookies.delete(name, cookieOptions);
}

export function initTheme(swell: Swell) {
  return new SwellTheme(swell, {
    forms,
    resources,
    shopifyCompatibilityClass: StorefrontShopifyCompatibility,
  });
}
