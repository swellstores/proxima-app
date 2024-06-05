import { Swell, SwellStorefrontRecord } from '@swell/storefrontjs';
import { Order } from 'swell-js';

export default function getOrderResource(
  swell: Swell,
  id: string,
  query: SwellData = {},
) {
  return new OrderResource(swell, id, query) as any as SwellStorefrontRecord &
    Order;
}

export class OrderResource extends SwellStorefrontRecord {
  constructor(swell: Swell, id: string, query: SwellData = {}) {
    super(swell, 'orders', id, query, () =>
      swell.storefront.account.getOrder(id, {
        ...query,
        expand: ['items.product', 'items.variant'],
      }),
    );
  }
}
