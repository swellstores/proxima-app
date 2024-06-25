import { Swell, StorefrontResource } from '@swell/storefrontjs';
import { getFilteredProducts } from './filterable-products';

export class SearchResource extends StorefrontResource {
  constructor(swell: Swell, query: string | null) {
    super(async () => {
      const performed = isSearchPerformed(query);

      const filteredProps = await getFilteredProducts(
        swell,
        performed ? { search: query } : undefined,
      );

      return {
        query,
        performed,
        ...filteredProps,
      };
    });
  }
}

export function isSearchPerformed(query: string | null) {
  return String(query || '').length > 0;
}
