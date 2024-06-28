import {
  Swell,
  SwellStorefrontRecord,
  SwellStorefrontCollection,
  SwellStorefrontSingleton,
} from '@swell/storefrontjs';

export class AccountResource extends SwellStorefrontSingleton {
  constructor(swell: Swell) {
    super(swell, 'account', async () => {
      const account = new SwellStorefrontSingleton(swell, 'account');

      await account.id;

      return account.id
        ? {
            ...account._result,
            addresses: new AccountAddressesResource(swell),
            orders: new AccountOrdersResource(swell),
            subscriptions: new AccountSubscriptionsResource(swell),
          }
        : null;
    });
  }
}

export class AccountAddressesResource extends SwellStorefrontCollection {
  constructor(swell: Swell) {
    super(swell, 'accounts:addresses', {}, () => {
      return swell.storefront.account.listAddresses(super._query);
    });
  }
}

export class AccountOrderResource extends SwellStorefrontRecord {
  constructor(swell: Swell, orderId: string, query: SwellData = {}) {
    super(swell, 'accounts:orders', orderId, query, () => {
      return swell.storefront.account.getOrder(orderId);
    });
  }
}

export class AccountOrdersResource extends SwellStorefrontCollection {
  constructor(swell: Swell, query: SwellData = {}) {
    super(swell, 'accounts:orders', query, () => {
      return swell.storefront.account.listOrders(super._query);
    });
  }
}

export class AccountSubscriptionResource extends SwellStorefrontRecord {
  constructor(swell: Swell, subscriptionId: string, query: SwellData = {}) {
    super(swell, 'accounts:subscriptions', subscriptionId, query, () => {
      return swell.storefront.subscriptions.get(subscriptionId, super._query);
    });
  }
}

export class AccountSubscriptionsResource extends SwellStorefrontCollection {
  constructor(swell: Swell, query: SwellData = {}) {
    super(swell, 'accounts:subscriptions', query, () => {
      return swell.storefront.subscriptions.list(super._query);
    });
  }
}
