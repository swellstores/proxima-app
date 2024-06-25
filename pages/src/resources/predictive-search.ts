import {
  Swell,
  StorefrontResource,
  SwellStorefrontCollection,
} from '@swell/storefrontjs';
import { isSearchPerformed } from './search';

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
