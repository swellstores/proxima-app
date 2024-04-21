import { Swell, SwellStorefrontRecord } from '@swell/storefrontjs';
import { Product } from 'swell-js';

export class ProductResource extends SwellStorefrontRecord {
  constructor(swell: Swell, slug: string) {
    super(swell, 'products', slug);
  }
}

export default function getProductResource(swell: Swell, slug: string) {
  return new ProductResource(swell, slug) as any as SwellStorefrontRecord &
    Product;
}
