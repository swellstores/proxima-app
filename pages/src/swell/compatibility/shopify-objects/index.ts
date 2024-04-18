import { SwellStorefrontCollection, SwellStorefrontRecord } from '@/swell/api';
import ShopifyArticle from './article';
import ShopifyBlog from './blog';
import ShopifyCollection from './collection';
import ShopifyFont from './font';
import ShopifyProduct from './product';
import ShopifyPage from './page';
import ShopifyLink from './link';
import ShopifySearch from './search';

export {
  ShopifyArticle,
  ShopifyBlog,
  ShopifyCollection,
  ShopifyFont,
  ShopifyProduct,
  ShopifyPage,
  ShopifyLink,
  ShopifySearch,
};

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
