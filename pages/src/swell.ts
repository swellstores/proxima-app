import { Swell, SwellTheme } from '@swell/storefrontjs';
import { AstroGlobal, APIContext, AstroCookieSetOptions } from 'astro';
import resources from './resources';
import storefrontConfig from '../storefront.json';
import StorefrontShopifyCompatibility from '@/utils/shopify-compatibility';

// IMPORTANT NOTE:
// Astro does not support setting multiple cookies in the same response
// There be a workaround to set cookies manually on the response object (todo)

export function initSwell(
  Astro: AstroGlobal | APIContext,
  options?: { [key: string]: any },
) {
  return new Swell({
    url: Astro.url,
    serverHeaders: Astro.request.headers,
    getCookie: (name: string) => {
      return getCookie(Astro, name);
    },
    setCookie: (
      name: string,
      value: string,
      options?: AstroCookieSetOptions,
      swell?: Swell,
    ) => {
      if (!(Astro as any).response && !swell?.sentResponse) {
        return setCookie(Astro, name, value, options);
      }
    },
    deleteCookie: (
      name: string,
      options?: AstroCookieSetOptions,
      swell?: Swell,
    ) => {
      if (!(Astro as any).response && !swell?.sentResponse) {
        return deleteCookie(Astro, name, options);
      }
    },
    ...options,
  });
}

export function getCookie(Astro: AstroGlobal | APIContext, name: string) {
  return Astro.cookies.get(name)?.value;
}

export function setCookie(
  Astro: AstroGlobal | APIContext,
  name: string,
  value: string,
  options?: AstroCookieSetOptions,
) {
  const cookieOptions = {
    path: '/',
    samesite: 'lax',
    ...options,
  };
  return Astro.cookies.set(name, value, cookieOptions);
}

export function deleteCookie(
  Astro: AstroGlobal | APIContext,
  name: string,
  options?: AstroCookieSetOptions,
) {
  const cookieOptions = {
    path: '/',
    samesite: 'lax',
    ...options,
  };
  return Astro.cookies.delete(name, cookieOptions);
}

export function initTheme(swell: Swell) {
  return new SwellTheme(swell, {
    resources,
    storefrontConfig,
    shopifyCompatibilityClass: StorefrontShopifyCompatibility,
  });
}
