import { pathToRegexp } from 'path-to-regexp';
import { decodeHTML } from 'entities';

import {
  handleMiddlewareRequest,
  SwellServerContext,
  SwellServerNext,
} from '@/utils/server';
import StorefrontShopifyCompatibility from '@/utils/shopify-compatibility';

const getThemePage = handleMiddlewareRequest(
  'GET',
  () => true,
  initThemePageHandler,
);

const getPageSections = handleMiddlewareRequest(
  'GET',
  () => true,
  renderSeparateSections,
);

const postThemePage = handleMiddlewareRequest(
  'POST',
  () => true,
  initThemePageHandler,
);

function initThemePageHandler(swellContext: SwellServerContext) {
  const { theme, context } = swellContext;
  const { redirect, url } = context;

  if (Array.isArray(theme.props.pages)) {
    const { pathname } = url;

    const pagePath = pathname.endsWith('/index.json')
      ? pathname.slice(0, -'/index.json'.length)
      : pathname.replace(/\.[^/]+$/, '');

    const page = theme.props.pages.find((page) => {
      const regexp = pathToRegexp(page.url);
      return regexp.test(pagePath);
    });

    if (page) {
      // If using .json extension, make sure page supports json or return 404
      const ext = url.pathname.match(/\.[^/]+$/)?.[0].replace('.', '');
      if (ext && !page.json) {
        return new Response(null, { status: 404 });
      }
    }
  }

  // Use compatibility instance if page was identified, otherwise use default
  const shopifyCompatibility =
    theme.shopifyCompatibility || new StorefrontShopifyCompatibility(theme);

  // Redirect shopify URLs to the adapted page
  const adaptedUrl = shopifyCompatibility.getAdaptedPageUrl(
    url.pathname + url.search,
  );

  if (adaptedUrl && adaptedUrl !== url.pathname) {
    return redirect(adaptedUrl, 307);
  }
}

async function renderSeparateSections(
  swellContext: SwellServerContext,
  next: SwellServerNext,
) {
  const { context } = swellContext;

  const sections = context.url.searchParams.get('sections');
  const section_id = context.url.searchParams.get('section_id');

  if (!sections && !section_id) {
    return next();
  }

  // Prevent response modification
  context.locals.raw = true;

  if (section_id) {
    return next();
  }

  const response = await next();
  response.headers.set('Content-Type', 'application/json');

  return new Response(parseHtmlEncodedJson(await response.text()), {
    headers: response.headers,
  });
}

function parseHtmlEncodedJson(encoded: string): string {
  let str = encoded.trim();

  if (str.startsWith('<!')) {
    const pos = str.indexOf('>');

    if (pos !== -1) {
      str = str.slice(pos + 1);
    }

    str = decodeHTML(str);
  }

  return str;
}

export default [getThemePage, getPageSections, postThemePage];
