import { Swell, SwellStorefrontSingleton } from '@swell/apps-sdk';

export class CartResource extends SwellStorefrontSingleton {
  constructor(swell: Swell) {
    super(swell, 'cart');
  }

  _isEmpty() {
    return !this._result?.items?.length;
  }
}
