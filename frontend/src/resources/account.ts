import {
  Swell,
  SwellData,
  SwellStorefrontRecord,
  SwellStorefrontCollection,
  SwellStorefrontSingleton,
} from '@swell/apps-sdk';

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
  constructor(swell: Swell, query: SwellData = {}) {
    const { page, limit } = swell.queryParams;
    super(
      swell,
      'accounts:addresses',
      { page, limit, ...(query || undefined) },
      function (this: SwellStorefrontCollection) {
        return swell.storefront.account.listAddresses(this._query);
      },
    );
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
    const { page, limit } = swell.queryParams;
    super(
      swell,
      'accounts:orders',
      { page, limit, ...(query || undefined) },
      function (this: SwellStorefrontCollection) {
        return swell.storefront.account.listOrders(this._query);
      },
    );
  }
}

export class AccountSubscriptionResource extends SwellStorefrontRecord {
  constructor(swell: Swell, subscriptionId: string, query: SwellData = {}) {
    super(
      swell,
      'accounts:subscriptions',
      subscriptionId,
      query,
      function (this: SwellStorefrontRecord) {
        return swell.storefront.subscriptions.get(subscriptionId, this._query);
      },
    );
  }
}

export class AccountSubscriptionsResource extends SwellStorefrontCollection {
  constructor(swell: Swell, query: SwellData = {}) {
    const { page, limit } = swell.queryParams;
    super(
      swell,
      'accounts:subscriptions',
      { page, limit, ...(query || undefined) },
      function (this: SwellStorefrontCollection) {
        return swell.storefront.subscriptions.list(this._query);
      },
    );
  }
}
