import { handleMiddlewareRequest } from '@/utils/server';
import storefrontConfig from '../../storefront.json';
import { pathToRegexp } from 'path-to-regexp';

export const getThemePage = handleMiddlewareRequest(
  'GET',
  () => true,
  initThemePageHandler,
);

export const postThemePage = handleMiddlewareRequest(
  'POST',
  () => true,
  initThemePageHandler,
);

async function initThemePageHandler(context: any) {
  const { theme, redirect, url } = context;

  if (storefrontConfig.pages instanceof Array) {
    const page = storefrontConfig.pages.find((page) => {
      const regexp = pathToRegexp(page.url);
      return Boolean(regexp.exec(url.pathname));
    });

    if (page) {
      await theme.initGlobals(page.id);
    }
  }

  // Redirect shopify URLs to the adapted page
  if (theme.shopifyCompatibility) {
    const adaptedUrl = theme.shopifyCompatibility.getAdaptedPageUrl(
      url.pathname,
    );

    if (adaptedUrl && adaptedUrl !== url.pathname) {
      return redirect(adaptedUrl, 301);
    }
  }
}

export default [getThemePage, postThemePage];
