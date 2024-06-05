import { Swell, SwellStorefrontRecord } from '@swell/storefrontjs';
import { Product } from 'swell-js';

export default function getProductResource(
  swell: Swell,
  slug: string,
  query: SwellData = {},
) {
  return new ProductResource(
    swell,
    slug,
    query,
  ) as any as SwellStorefrontRecord & Product;
}

export class ProductResource extends SwellStorefrontRecord {
  constructor(swell: Swell, slug: string, query: SwellData = {}) {
    super(swell, 'products', slug, query);
  }
}
