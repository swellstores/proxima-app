import { Swell, SwellStorefrontSingleton } from '@swell/storefront-sdk';

export class CartResource extends SwellStorefrontSingleton {
  constructor(swell: Swell) {
    super(swell, 'cart');
  }
}
