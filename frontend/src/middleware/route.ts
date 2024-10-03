import { handleMiddlewareRequest, SwellServerContext } from '@/utils/server';
import StorefrontShopifyCompatibility from '@/utils/shopify-compatibility';
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

async function initThemePageHandler(context: SwellServerContext) {
  const { theme, redirect, url } = context;

  if (theme.props.pages instanceof Array) {
    const pagePath = url.pathname.replace(/\.[^\/]+$/, '');

    const page = theme.props.pages.find((page: any) => {
      const regexp = pathToRegexp(page.url);
      return Boolean(regexp.exec(pagePath));
    });

    if (page) {
      await theme.initGlobals(page.id);
    }
  }

  // Use compatibility instance if page was identified, otherwise use default
  const shopifyCompatibility = theme.props?.compatibility?.shopify
    ? theme.shopifyCompatibility || new StorefrontShopifyCompatibility(theme)
    : null;

  // Redirect shopify URLs to the adapted page
  if (shopifyCompatibility) {
    const adaptedUrl = shopifyCompatibility.getAdaptedPageUrl(
      url.pathname + url.search,
    );

    if (adaptedUrl && adaptedUrl !== url.pathname) {
      return redirect(adaptedUrl, 307);
    }
  }
}

export default [getThemePage, postThemePage];
