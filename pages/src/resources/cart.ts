import { Swell, SwellStorefrontSingleton } from '@swell/storefrontjs';

export class CartResource extends SwellStorefrontSingleton {
  constructor(swell: Swell) {
    super(swell, 'cart');
  }
}
