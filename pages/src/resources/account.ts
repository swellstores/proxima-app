import { Swell, SwellStorefrontSingleton } from '@swell/storefrontjs';
import { Account } from 'swell-js';

export class AccountResource extends SwellStorefrontSingleton {
  constructor(swell: Swell) {
    super(swell, 'account');
  }
}

export default function getAccountResource(swell: Swell) {
  return new AccountResource(swell) as any as SwellStorefrontSingleton &
    Account;
}
