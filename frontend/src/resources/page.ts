import { Swell, SwellData, SwellStorefrontRecord } from '@swell/apps-sdk';

export class PageResource extends SwellStorefrontRecord {
  constructor(swell: Swell, slug: string, query: SwellData = {}) {
    super(swell, 'content/pages', slug, query);
  }
}
