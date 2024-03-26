import { ShopifyResource } from './resource';

export default function ShopifyPage(
  _instance: ShopifyCompatibility,
  page: SwellData,
) {
  if (page instanceof ShopifyResource) {
    return page.clone();
  }
  return new ShopifyResource({
    author: page.author,
    content: page.content,
    handle: page.slug,
    metafields: null,
    published_at: page.date_updated,
    template_suffix: null, // TODO
    title: page.name,
    url: `/pages/${page.slug}`,
  });
}
