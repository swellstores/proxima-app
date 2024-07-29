import { Swell, SwellStorefrontRecord } from '@swell/storefront-sdk';

export class PageResource extends SwellStorefrontRecord {
  constructor(swell: Swell, slug: string, query: SwellData = {}) {
    super(swell, 'content/pages', slug, query);
  }
}
