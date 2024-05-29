import {
  Swell,
  StorefrontResource,
  SwellStorefrontCollection,
} from '@swell/storefrontjs';

export type ListParams = {
  sort?: string | null;
  filter?: any;
  [key: string]: any;
};

export class ProductListResource extends StorefrontResource {
  constructor(swell: Swell, { sort, filter, ...query }: ListParams) {
    super(async () => {
      const products = new SwellStorefrontCollection(swell, 'products', {
        ...query,
        sort,
        // TODO: Implement filters
        filter,
      });

      const results = await products.results;

      const filters = new StorefrontResource(() => {
        return swell.storefront.products.filters(results as any[]);
      });

      return {
        results,
        filters,
        count: products.count,
        limit: products.limit,
        pages: products.pages,
        page: products.page,
      };
    });
  }
}

export default function getProductCollectionResource(
  swell: Swell,
  params: ListParams,
) {
  return new ProductListResource(swell, params);
}
