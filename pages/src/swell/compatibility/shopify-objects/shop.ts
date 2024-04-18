import { ShopifyResource } from './resource';

export default function ShopifyShop(
  _instance: ShopifyCompatibility,
  store: SwellData,
) {
  const moneyFormat = store.currencies.find(
    (currency: any) => currency.code === store.currency,
  );

  return new ShopifyResource({
    accepts_gift_cards: true, // TODO
    address: {}, // TODO
    brand: {}, // TODO
    collections_count: 0, // TODO
    currency: store.currency,
    customer_accounts_enabled: true, // TODO
    customer_accounts_optional: true, // TODO
    description: store.description, // TODO
    domain: store.url.replace(/^http[s]?:\/\//, ''),
    email: store.support_email,
    enabled_currencies: store.currencies.map((currency: any) => ({
      // currency object
      iso_code: currency.code,
      name: currency.name,
      symbol: currency.symbol,
    })),
    enabled_payment_providers: [], // TODO
    id: store.id,
    metafields: null,
    metaobjects: null,
    money_format: store.currencies.find(
      (currency: any) => currency.code === store.currency,
    ),
    money_with_currency_format: {
      ...moneyFormat,
      symbol: `${store.currency} ${moneyFormat.symbol}`,
    },
    name: store.name,
    password_message: null, // TODO
    permanent_domain: `${store.id}.swell.store`,
    phone: store.support_phone,
    published_locales: store.locales.map((locale: any) => ({
      // shop_locale object
      endonym_name: locale.name,
      iso_code: locale.code,
      name: locale.name,
      primary: locale.code === store.locale,
      root_url: store.url, // TODO
    })),
    secure_url: store.url,
    types: [], // TODO: product types
    url: store.url,
    vendors: [], // TODO: product vendors

    policies: [], // TODO
    privacy_policy: null, // TODO
    refund_policy: null, // TODO
    shipping_policy: null, // TODO
    subscription_policy: null, // TODO
    terms_of_service: null, // TODO
    products_count: 0, // TODO
  });
}
