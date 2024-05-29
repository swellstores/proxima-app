import { Swell } from '@swell/storefrontjs';
import { AstroGlobal, APIContext, AstroCookieSetOptions } from 'astro';

export function initSwell(
  Astro: AstroGlobal | APIContext,
  options?: { [key: string]: any },
) {
  return new Swell({
    serverHeaders: Astro.request.headers,
    getCookie: (name: string) => {
      return Astro.cookies.get(name)?.value;
    },
    setCookie: (
      name: string,
      value: string,
      options?: AstroCookieSetOptions,
    ) => {
      if (!(Astro as any).response) {
        const cookieOptions = {
          path: '/',
          samesite: 'lax',
          ...options,
        };
        return Astro.cookies.set(name, value, cookieOptions);
      }
    },
    ...options,
  });
}
