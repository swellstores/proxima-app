import { ShopifyResource, defer } from './resource';
import ShopifyProduct from './product';

export default function ShopifyCollection(
  instance: ShopifyCompatibility,
  products: StorefrontResource | SwellRecord,
) {
  if (products instanceof ShopifyResource) {
    return products.clone();
  }
  return new ShopifyResource({
    products: defer(async () =>
      (await products.results).map((product: any) =>
        ShopifyProduct(instance, product),
      ),
    ),
    all_products_count: defer(() => products.count),
    all_tags: defer(async () =>
      (await products.results).reduce((types: any[], product: SwellRecord) => {
        return types.concat(product.tags || []);
      }, []),
    ),
    all_types: defer(async () =>
      (await products.results).reduce((types: any[], product: SwellRecord) => {
        return types.concat(product.type || []);
      }, []),
    ),
    products_count: defer(async () => (await products.results).length),
    all_vendors: [],
    current_type: null,
    current_vendor: null,
    default_sort_by: 'popularity',
    description: null,
    featured_image: null,
    filters: null, // TODO: need to support this in the resource class, should use swell.storefront.products.filters()
    handle: 'all',
    id: 'all',
    image: null,
    metafields: null,
    next_product: null,
    previous_product: null,
    published_at: null,
    sort_by: 'popularity',
    sort_options: [
      { value: `popularity`, name: 'Popularity' },
      { value: `price_asc`, name: 'Price ascending' },
      { value: `price_desc`, name: 'Price descending' },
      { value: `date_asc`, name: 'Date ascending' },
      { value: `date_desc`, name: 'Date descending' },
    ],
    tags: [],
    template_suffix: null,
    title: 'Products',
    url: '/collections/all',
  });
}
