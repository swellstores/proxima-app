import { handleMiddlewareRequest } from '@/utils/server';
import StorefrontShopifyCompatibility from '@/utils/shopify-compatibility';
import storefrontConfig from '../../storefront.json';

export const shopifyRouteCompatibility = handleMiddlewareRequest(
  'GET',
  () => true,
  async (context: any) => {
    const { swell, redirect, url } = context;

    if (!storefrontConfig.shopify_compatibility) return;

    // Middleware runs before theme is loaded, so we need to load the compatibility class here
    const shopifyCompatibility = new StorefrontShopifyCompatibility(swell);

    const adaptedUrl = (shopifyCompatibility as any).getAdaptedPageUrl(
      url.pathname,
    );

    if (adaptedUrl && adaptedUrl !== url.pathname) {
      return redirect(adaptedUrl, 301);
    }
  },
);
