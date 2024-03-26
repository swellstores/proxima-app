import { Swell } from '../api';
import ShopifyShop from './shopify-objects/shop';
import {
  adaptShopifyData,
  adaptShopifyProps,
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
    globals.shop = this.getShopData(globals);
    /*
     * Note: page is used both globally and in content pages
     * https://shopify.dev/docs/api/liquid/objects/page
     */
    globals.page = {
      ...(globals.page || undefined),
      id: this.getPageType(globals.page?.id),
      url: serverParams.path,
    };

    globals.request = {
      ...(globals.request || undefined),
      host: serverParams.host,
      origin: serverParams.origin,
      path: serverParams.path,
      locale: globals.store?.locale,
      design_mode: this.swell.isEditor,
      visual_section_preview: false, // TODO: Add support for visual section preview
      page_type: globals.page.id,
    };

    globals.linklists = globals.menus;

    globals.current_page = 1; // TODO: pagination page
  }

  getShopData({ store }: ThemeGlobals) {
    if (store) {
      return ShopifyShop(this, store);
    }
    return {};
  }

  // Override me to convert storefront app pages to Shopify page types
  getPageType(pageId: any) {
    return pageId;
  }

  getContentForHeader() {
    return `<script>var Shopify = Shopify || {};</script>`;
  }

  getThemeFilePath(type: string, name: string) {
    switch (type) {
      case 'assets':
        return `assets/${name}`;
      case 'components':
        return `snippets/${name}`;
      case 'config':
        return `config/${name}`;
      case 'layouts':
        return `layout/${name}`;
      case 'pages':
        return `templates/${this.getPageType(name)}`;
      case 'sections':
        return `sections/${name}`;
      default:
        throw new Error(`Theme file type not supported: ${type}`);
    }
  }

  getResourceData(
    resource: SwellStorefrontCollection | SwellStorefrontRecord,
  ): SwellData {
    return adaptShopifyData(this, resource);
  }

  getResourceProps(
    resource: SwellStorefrontCollection | SwellStorefrontRecord,
  ): SwellData {
    return adaptShopifyProps(this, resource);
  }

  getMenuData(menu: SwellMenu): SwellData {
    return adaptShopifyMenuData(this, menu);
  }

  getLookupData(
    collection: string,
    setting: ThemeSettingFieldSchema,
    value: any,
    defaultHandler: () => SwellData | null,
  ): SwellData | null {
    return adaptShopifyLookupData(
      this,
      collection,
      setting,
      value,
      defaultHandler,
    );
  }

  getFontData(font: ThemeFont): SwellData {
    return adaptShopifyFontData(this, font);
  }

  getFontFromShopifySetting(fontSetting: string) {
    return shopifyFontToThemeFront(fontSetting);
  }

  getEditorConfig(settingsSchema: ShopifySettingsSchema): ThemeEditorSchema {
    return convertShopifySettingsSchema(this, settingsSchema);
  }

  getThemeConfig(settingsData: ShopifySettingsData): ThemeSettings {
    return convertShopifySettingsData(this, settingsData);
  }

  getPresetsConfig(settingsData: ShopifySettingsData): SwellData {
    return convertShopifySettingsPresets(this, settingsData);
  }

  getSectionConfig(sectionSchema: ShopifySectionSchema): ThemeSectionSchema {
    return convertShopifySectionConfig(this, sectionSchema);
  }
}
