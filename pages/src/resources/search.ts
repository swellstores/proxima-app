import {
  Swell,
  StorefrontResource,
  SwellStorefrontCollection,
} from '@swell/storefrontjs';

export type SearchParams = {
  search?: string | null;
  sort?: string | null;
  filter?: any;
};

export class SearchResource extends StorefrontResource {
  constructor(swell: Swell, { search, sort, filter }: SearchParams) {
    super(async () => {
      const products = new SwellStorefrontCollection(swell, 'products', {
        search,
        sort,
        // TODO: Implement filters
        filter,
      });

      await products.results;

      return {
        performed: String(search || '').length > 0 ? true : false,
        products: products,
        terms: search,
        sort,
        // TODO:
        filters: [],
      };
    });
  }
}

export default function getSearchResource(swell: Swell, params: SearchParams) {
  return new SearchResource(swell, params);
}
