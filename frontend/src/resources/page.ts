import { Swell, SwellStorefrontRecord } from '@swell/storefrontjs';

export class PageResource extends SwellStorefrontRecord {
  constructor(swell: Swell, slug: string, query: SwellData = {}) {
    super(swell, 'content/pages', slug, query);
  }
}
