import { ShopifyResource, defer } from './resource';

export default function ShopifyPage(
  _instance: ShopifyCompatibility,
  page: SwellData,
) {
  if (page instanceof ShopifyResource) {
    return page.clone();
  }
  return new ShopifyResource({
    content: defer(() => page.content),
    handle: defer(() => page.slug),
    metafields: null,
    published_at: defer(
      async () => (await page.date_published) || page.date_created,
    ),
    template_suffix: null, // TODO
    title: defer(async () => (await page.title) || page.name), // Due to deprecated name field
    url: defer(async () => (await page.slug) && `/pages/${page.slug}`),

    // Not supported
    author: null,
  });
}
