import { SwellStorefrontCollection, SwellStorefrontRecord } from '@/swell/api';
import ShopifyCollection from './collection';
import ShopifyProduct from './product';
import ShopifyPage from './page';
import ShopifyLink from './link';
import ShopifyFont from './font';

export function adaptShopifyData(
  instance: ShopifyCompatibility,
  resource: any,
): SwellData {
  if (resource instanceof SwellStorefrontCollection) {
    // Products are always contained in a collection
    if (resource?._collection === 'products') {
      return {
        collection: ShopifyCollection(instance, resource as any),
      };
    }
  }

  return {};
}

export function adaptShopifyProps(
  instance: ShopifyCompatibility,
  resource: any,
): SwellData {
  if (resource instanceof SwellStorefrontCollection) {
    return {
      size: resource.results.length,
    };
  } else if (resource instanceof SwellStorefrontRecord) {
    if (resource?._collection === 'products') {
      return ShopifyProduct(instance, resource as any);
    }
    if (resource?._collection === 'categories') {
      const products = new SwellStorefrontCollection(
        instance.swell,
        'products',
        {
          categories: [resource._id],
        },
      );
      return ShopifyCollection(instance, products);
    }
    if (resource?._collection === 'content/pages') {
      return ShopifyPage(instance, resource as any);
    }
  }

  return {};
}

export function adaptShopifyMenuData(
  instance: ShopifyCompatibility,
  menu: SwellMenu,
): SwellData {
  const shopifyLinkList = {
    ...menu,
    handle: menu.id.replace(/\_/g, '-'),
    title: menu.name,
  };
  return {
    ...shopifyLinkList,
    links: menu.items?.map((item) =>
      ShopifyLink(instance, shopifyLinkList, item),
    ),
  };
}

export function adaptShopifyLookupData(
  instance: ShopifyCompatibility,
  collection: string,
  setting: ThemeSettingFieldSchema,
  value: any,
  defaultHandler: () => SwellData | null,
): SwellData | null {
  if (!setting.multi) {
    if (collection === 'categories') {
      if (value === 'all') {
        const products = new SwellStorefrontCollection(
          instance.swell,
          'products',
        );
        return ShopifyCollection(instance, products);
      }
    }
  }

  return defaultHandler();
}

export function adaptShopifyFontData(
  instance: ShopifyCompatibility,
  font: ThemeFont,
): SwellData {
  return ShopifyFont(instance, font);
}
