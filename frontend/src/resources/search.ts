import {
  Swell,
  StorefrontResource,
  SwellStorefrontCollection,
} from '@swell/apps-sdk';
import { getProductFilters } from './product';

export class SearchResource extends StorefrontResource {
  constructor(swell: Swell, query: string | null) {
    super(async () => {
      const performed = isSearchPerformed(query);

      const productFilters = await getProductFilters(
        swell,
        performed ? { search: query } : undefined,
      );

      return {
        query,
        performed,
        ...productFilters,
      };
    });
  }
}

export class PredictiveSearchResource extends StorefrontResource {
  constructor(swell: Swell, query: string | null) {
    super(async () => {
      const performed = isSearchPerformed(query);

      let products;
      if (performed) {
        products = new SwellStorefrontCollection(swell, 'products', {
          search: query,
          limit: 10,
        });
        await products.results;
      }

      return {
        query,
        performed,
        products,
      };
    });
  }
}

export function isSearchPerformed(query: string | null) {
  return String(query || '').length > 0;
}
