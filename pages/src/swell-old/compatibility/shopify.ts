import { Swell, StorefrontResource } from '../api';
import ShopifyShop from './shopify-objects/shop';
import {
  adaptShopifyMenuData,
  adaptShopifyLookupData,
  adaptShopifyFontData,
} from './shopify-objects';
import {
  convertShopifySettingsSchema,
  convertShopifySettingsData,
  convertShopifySettingsPresets,
  convertShopifySectionConfig,
} from './shopify-configs';
import { shopifyFontToThemeFront } from './shopify-fonts';

/*
 * This class is meant to be extended by a storefront app to provide compatibility with Shopify's Liquid
 */
export class ShopifyCompatibility implements ShopifyCompatibility {
  public swell: Swell;
  public pageId?: string;
  public pageResourceMap?: ShopifyPageResourceMap;
  public objectResourceMap?: ShopifyObjectResourceMap;

  constructor(swell: Swell) {
    this.swell = swell;
  }

  adaptGlobals(
    globals: ThemeGlobals,
    serverParams: {
      host: string;
      origin: string;
      path: string;
    },
  ) {
    const { store, page, menus } = globals;

    this.pageId = this.getPageType(page?.id);
    this.pageResourceMap = this.getPageResourceMap();
    this.objectResourceMap = this.getObjectResourceMap();

    globals.shop = this.getShopData(globals);

    /*
     * Note: page is used both globally and in content pages
     * https://shopify.dev/docs/api/liquid/objects/page
     */
    globals.page = {
      ...(page || undefined),
      id: this.pageId,
      url: serverParams.path,
    };

    globals.request = {
      host: serverParams.host,
      origin: serverParams.origin,
      path: serverParams.path,
      locale: store?.locale,
      design_mode: this.swell.isEditor,
      visual_section_preview: false, // TODO: Add support for visual section preview
      page_type: page?.id,
    };

    globals.linklists = menus;

    globals.current_page = 1; // TODO: pagination page

    globals.routes = this.getPageRouteMap();
  }

  adaptPageData(pageData: SwellData) {
    if (!this.pageId || !this.pageResourceMap) {
      return;
    }

    const pageMap = this.pageResourceMap.find(
      ({ page }) => page === this.pageId,
    );

    // Add object resources to the page based on the page resource map
    if (pageMap) {
      for (const [key, value] of Object.entries(pageData)) {
        const resourceMap = pageMap.resources.find(({ from }) => from === key);
        if (resourceMap && value instanceof StorefrontResource) {
          pageData[key] = resourceMap.object(this as any, value);
        }
      }
    }

    this.adaptObjectData(pageData);
  }

  adaptObjectData(objectData: SwellData) {
    if (!this.pageId || !this.objectResourceMap) {
      return;
    }

    // Adapt individual resources to shopify objects from page data
    for (const value of Object.values(objectData)) {
      const objectMap = this.objectResourceMap.find(
        ({ from }: { from: any }) => value instanceof from,
      );
      if (objectMap) {
        const objectProps = objectMap.object(this as any, value);
        Object.assign(value, objectProps);
      }
    }
  }

  getShopData({ store }: ThemeGlobals) {
    if (store) {
      return ShopifyShop(this as any, store);
    }
    return {};
  }

  getContentForHeader() {
    return `<script>var Shopify = Shopify || {};</script>`;
  }

  getMenuData(menu: SwellMenu): SwellData {
    return adaptShopifyMenuData(this as any, menu);
  }

  getLookupData(
    collection: string,
    setting: ThemeSettingFieldSchema,
    value: any,
    defaultHandler: () => SwellData | null,
  ): SwellData | null {
    return adaptShopifyLookupData(
      this as any,
      collection,
      setting,
      value,
      defaultHandler,
    );
  }

  getFontData(font: ThemeFont): SwellData {
    return adaptShopifyFontData(this as any, font);
  }

  getFontFromShopifySetting(fontSetting: string) {
    return shopifyFontToThemeFront(fontSetting);
  }

  getEditorConfig(settingsSchema: ShopifySettingsSchema): ThemeEditorSchema {
    return convertShopifySettingsSchema(this as any, settingsSchema);
  }

  getThemeConfig(settingsData: ShopifySettingsData): ThemeSettings {
    return convertShopifySettingsData(this as any, settingsData);
  }

  getPresetsConfig(settingsData: ShopifySettingsData): SwellData {
    return convertShopifySettingsPresets(this as any, settingsData);
  }

  getLocaleConfig(settingConfigs: SwellCollection, localeCode: string) {
    const shopifyLocaleConfigs = settingConfigs?.results?.filter(
      (config: SwellRecord) => config?.file_path?.startsWith('theme/locales/'),
    );

    let localeConfig = shopifyLocaleConfigs?.find(
      (config: SwellRecord) =>
        config?.file_path === `theme/locales/${localeCode}.json`,
    );

    if (!localeConfig) {
      // Fall back to short code locale
      const localeShortCode = localeCode.split('-')[0];
      localeConfig = shopifyLocaleConfigs?.find(
        (config: SwellRecord) =>
          config?.file_path === `theme/locales/${localeShortCode}.json`,
      );

      if (!localeConfig) {
        // Fall back to default locale
        localeConfig = shopifyLocaleConfigs?.find((config: SwellRecord) =>
          config?.file_path?.endsWith(`.default.json`),
        );
      }
    }

    try {
      return JSON.parse(localeConfig?.file_data);
    } catch {
      return {};
    }
  }

  getSectionConfig(sectionSchema: ShopifySectionSchema): ThemeSectionSchema {
    return convertShopifySectionConfig(this as any, sectionSchema);
  }

  /*
   * Override these methods for app compatibility implementation
   */

  getPageType(pageId: string) {
    return pageId;
  }

  getPageRouteUrl(pageId: string) {
    return pageId;
  }

  getPageRouteMap() {
    return {
      account_addresses_url: this.getPageRouteUrl('account/addresses'),
      account_login_url: this.getPageRouteUrl('account/login'),
      account_logout_url: this.getPageRouteUrl('account/logout'),
      account_recover_url: this.getPageRouteUrl('account/recover'),
      account_register_url: this.getPageRouteUrl('account/signup'),
      account_url: this.getPageRouteUrl('account/index'),
      all_products_collection_url: this.getPageRouteUrl('products/index'),
      cart_add_url: this.getPageRouteUrl('cart/add'),
      cart_change_url: this.getPageRouteUrl('cart/change'),
      cart_clear_url: this.getPageRouteUrl('cart/clear'),
      cart_update_url: this.getPageRouteUrl('cart/update'),
      cart_url: this.getPageRouteUrl('cart'),
      collections_url: this.getPageRouteUrl('categories/index'),
      predictive_search_url: this.getPageRouteUrl('search/suggest'),
      product_recommendations_url: this.getPageRouteUrl('products/index'),
      root_url: this.getPageRouteUrl('index'),
      search_url: this.getPageRouteUrl('search'),
    };
  }

  getThemeFilePath(type: string, name: string) {
    return `${type}/${name}`;
  }

  getPageResourceMap(): ShopifyPageResourceMap {
    return [];
  }

  getObjectResourceMap(): ShopifyObjectResourceMap {
    return [];
  }

  /* getResourceData(resource: StorefrontResource): SwellData {
    return {};
  }

  getResourceProps(resource: StorefrontResource): SwellData {
    return {};
  } */
}
