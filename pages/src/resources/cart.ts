import { Swell, SwellStorefrontSingleton } from '@swell/storefrontjs';
import { Cart } from 'swell-js';

export class CartResource extends SwellStorefrontSingleton {
  constructor(swell: Swell) {
    super(swell, 'cart');
  }
}

export default function getCartResource(swell: Swell) {
  return new CartResource(swell) as any as SwellStorefrontSingleton & Cart;
}
