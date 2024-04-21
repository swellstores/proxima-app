import { ShopifyResource, defer } from './resource';
import ShopifyProduct from './product';

export default function ShopifySearch(
  instance: ShopifyCompatibility,
  search: any,
) {
  if (search instanceof ShopifyResource) {
    return search.clone();
  }

  return new ShopifyResource({
    default_sort_by: 'relevance',
    filters: [],
    performed: defer(async () =>
      (await search.terms) && String(search.terms || '').length > 0
        ? true
        : false,
    ),
    results: defer(async () => {
      await search.products;
      await search.products.results;
      return search.products?.results?.map((product: any) => {
        const shopifyProduct = ShopifyProduct(instance, product) as any;
        shopifyProduct.object_type = 'product';
        return shopifyProduct;
      });
    }),
    results_count: defer(async () => (await search.products)?.count || 0),
    sort_by: search.sort,
    sort_options: [
      { value: 'relevance', name: 'Relevance' },
      { value: 'price-ascending', name: 'Price, low to high' },
      { value: 'price-descending', name: 'Price, high to low' },
    ],
    types: ['product'],

    // TODO: Implement filters
    filter: search.filters || [],
  });
}
