import { handleMiddlewareRequest, SwellServerContext } from '@/utils/server';
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
    const page = theme.props.pages.find((page: any) => {
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
