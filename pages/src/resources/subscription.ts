import { Swell, SwellStorefrontRecord } from '@swell/storefrontjs';
import { Subscription } from 'swell-js';

export class SubscriptionResource extends SwellStorefrontRecord {
  constructor(swell: Swell, id: string, query: SwellData = {}) {
    super(swell, 'subscriptions', id, query);
  }
}

export default function getSubscriptionResource(
  swell: Swell,
  id: string,
  query: SwellData = {},
) {
  return new SubscriptionResource(
    swell,
    id,
    query,
  ) as any as SwellStorefrontRecord & Subscription;
}
