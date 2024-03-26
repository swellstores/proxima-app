import clone from "lodash/clone";
import get from "lodash/get";
import each from 'lodash/each';
import { AstroGlobal } from 'astro';
import storefrontConfig from '../../storefront.json';
import {
  Swell,
  SwellStorefrontResource,
  SwellStorefrontCollection,
  SwellStorefrontRecord,
} from './api';
import { LiquidSwell, ThemeColor, ThemeFont } from './liquid-next';
import { ShopifyCompatibility } from './compatibility/shopify';
import { resolveMenuSettings } from './menus';
import {
  themeConfigQuery,
  getPageSections,
  getLayoutSectionGroups,
  getSectionGroupConfigs,
  isObject,
} from './utils';

export class SwellTheme {
  public swell: Swell;
  public storefrontConfig: SwellStorefrontConfig;
  public liquidSwell: LiquidSwell;

  public url: string | undefined;
  public page: any;
  public pageId: string | undefined;
  public globals: ThemeGlobals | undefined;
  public request: ThemeSettings | null = null;
  public shopifyCompatibility: any = null;
  public shopifyCompatibilityClass: typeof ShopifyCompatibility =
    SwellStorefrontShopifyCompatibility;

  constructor(swell: Swell) {
    this.swell = swell;
    this.storefrontConfig = storefrontConfig;
    this.liquidSwell = new LiquidSwell({
      storefrontConfig,
      getThemeConfig: this.getThemeConfig.bind(this),
      getAssetUrl: this.getAssetUrl.bind(this),
      getThemeTemplateConfigByType:
        this.getThemeTemplateConfigByType.bind(this),
      renderTemplate: this.renderTemplate.bind(this),
      renderTemplateString: this.renderTemplateString.bind(this),
      renderTemplateSections: this.renderTemplateSections.bind(this),
      renderLanguage: this.lang.bind(this),
      renderCurrency: this.renderCurrency.bind(this),
      isEditor: swell.isEditor,
    });
  }

  async init(Astro: AstroGlobal, pageId?: string) {
    this.pageId = pageId;
    this.url = Astro.url.pathname;

    const { store, menus, configs } = await this.getSettingsAndConfigs();
    const { settings, page } = await this.resolvePageData(configs, pageId);

    this.page = page;

    this.setGlobals(
      {
        store,
        settings,
        menus,
        page,
        configs,
        language: configs?.language,
        canonical_url: `${store.url}${this.url}`,
        // Flag to enable Shopify compatibility in sections and tags/filters
        shopify_compat: Boolean(settings.$shopify_compatibility),
      },
      Astro,
    );
  }

  async getSettingsAndConfigs(): Promise<{
    store: SwellData;
    menus: { [key: string]: SwellMenu };
    configs: ThemeConfigs;
  }> {
    return await this.swell.getCached('theme-globals', async () => {
      const [storefrontSettings, settingConfigs] = await Promise.all([
        this.swell.getCached('store-settings', async () => {
          return await this.swell.getStorefrontSettings();
        }),
        this.getAllThemeConfigs(),
      ]);

      const configs: ThemeConfigs = {
        theme: {},
        editor: {},
        language: {},
        presets: [],
        ...(settingConfigs?.results || [])
          .filter((config: SwellRecord) =>
            config?.file_path?.startsWith('theme/config/'),
          )
          .reduce(
            (acc: object, config: SwellRecord): { [key: string]: any } => {
              const configName = config.name.split('.')[0];
              let configValue;
              if (config?.file_path?.endsWith('.json')) {
                try {
                  configValue = JSON.parse(config.file_data);
                } catch (err) {
                  configValue = null;
                }
              }
              if (configName) {
                return {
                  ...acc,
                  [configName]: configValue,
                };
              }
              return acc;
            },
            {},
          ),
      };

      this.setCompatibilityConfigs(configs);

      // Resolve menus after compatibility is determined
      const menus = resolveMenuSettings(this, this.swell.getStorefrontMenus(), {
        currentUrl: this.url,
      });

      return {
        store: storefrontSettings?.store,
        menus,
        configs,
      };
    });
  }

  resolvePageData(
    configs: SwellData,
    pageId?: string,
  ): {
    settings: ThemeSettings;
    page: ThemeSettings;
  } {
    return this.swell.getCachedSync(
      'theme-settings-resolved',
      [this.url, pageId],
      () => {
        const settings = resolveThemeSettings(
          this,
          configs.theme,
          configs.editor?.settings,
        );
        return {
          settings,
          page: storefrontConfig.pages.find(
            (page: ThemeSettings) => page.id === pageId,
          ),
        };
      },
    );
  }

  setGlobals(globals: SwellData, Astro?: AstroGlobal) {
    // Note: All globals are set manually on the client side in the editor
    if (this.shopifyCompatibility && Astro) {
      this.shopifyCompatibility.adaptGlobals(globals, {
        host: Astro.url.host,
        origin: Astro.url.origin,
        path: Astro.url.pathname,
      });
    }

    this.globals = {
      ...this.globals,
      ...globals,
    };
    this.liquidSwell.globals = this.globals;
    this.liquidSwell.engine.options.globals = this.globals;
  }

  setShopifyCompatibilityClass(klass: typeof ShopifyCompatibility) {
    this.shopifyCompatibility = new klass(this.swell);
  }

  setCompatibilityConfigs(configs: ThemeConfigs) {
    const shopifyCompatibility = () => {
      if (!this.shopifyCompatibility) {
        this.shopifyCompatibility = new this.shopifyCompatibilityClass(
          this.swell,
        );
      }
      return this.shopifyCompatibility;
    };

    if (!Object.keys(configs.editor).length && configs.settings_schema) {
      configs.editor = shopifyCompatibility().getEditorConfig(
        configs.settings_schema,
      );
    }

    if (!Object.keys(configs.theme).length && configs.settings_data) {
      configs.theme = shopifyCompatibility().getThemeConfig(
        configs.settings_data,
      );
    }

    if (!Object.keys(configs.presets).length && configs.settings_data) {
      configs.presets = shopifyCompatibility().getPresetsConfig(
        configs.settings_data,
      );
    }

    // Make sure compatibility instance and config setting are resolved
    if (configs.theme.$shopify_compatibility) {
      shopifyCompatibility();
    } else if (this.shopifyCompatibility) {
      configs.theme.$shopify_compatibility = true;
    }
  }

  setCompatibilityData(pageData: SwellData) {
    if (!this.shopifyCompatibility) {
      return;
    }
    if (pageData) {
      for (const prop of Object.values(pageData)) {
        if (prop instanceof SwellStorefrontResource) {
          prop.setCompatibilityData(prop, this.shopifyCompatibility, pageData);
        }
      }
    }
  }

  resolveLookupSetting(
    setting: ThemeSettingFieldSchema,
    value: any,
  ): SwellData | SwellStorefrontRecord | SwellStorefrontCollection | null {
    const collection = resolveLookupCollection(setting);
    if (collection) {
      const defaultHandler = () => {
        if (setting.multi) {
          return new SwellStorefrontCollection(this.swell, collection, {
            limit: setting.limit || 15,
          });
        } else if (value !== null && value !== undefined) {
          return new SwellStorefrontRecord(this.swell, collection, value);
        }
        return null;
      };

      if (this.shopifyCompatibility) {
        return this.shopifyCompatibility.getLookupData(
          collection,
          setting,
          value,
          defaultHandler,
        );
      }

      return defaultHandler();
    }
    return null;
  }

  resolveMenuSetting(value: string): SwellMenu | null {
    if (!value) {
      return null;
    }

    const allMenus = this.globals?.menus || {};
    const menu = allMenus[value] || allMenus[value.replace(/-/g, '_')];

    return menu || null;
  }

  async lang(key: string, data?: any): Promise<string> {
    return await this.renderLanguage(key, data);
  }

  resolveFontSetting(value: string): ThemeFont | null {
    if (this.shopifyCompatibility) {
      const fontSetting =
        this.shopifyCompatibility.getFontFromShopifySetting(value);

      const adaptedFont = new ThemeFont(fontSetting || value);
      Object.assign(
        adaptedFont,
        this.shopifyCompatibility.getFontData(adaptedFont),
      );

      return adaptedFont;
    }

    return new ThemeFont(value);
  }

  themeConfigQuery() {
    const { swellHeaders } = this.swell;
    return themeConfigQuery(swellHeaders);
  }

  async getEditorSchema(): Promise<ThemeEditorSchema> {
    return await this.swell.getCached('editor-settings', async () => {
      return await this.swell.get('/:themes:configs', {
        ...this.themeConfigQuery(),
        file_path: 'settings/editor.json',
        fields: 'type, name, file, file_path, file_data',
        include: {
          file_data: {
            url: '/:themes:configs/{id}/file/data',
          },
        },
      });
    });
  }

  async getAllThemeConfigs(): Promise<SwellCollection> {
    return await this.swell.getCached('theme-configs-all', async () => {
      return await this.swell.get('/:themes:configs', {
        ...this.themeConfigQuery(),
        // TODO: paginate to support more than 1000 configs
        limit: 1000,
        fields: 'type, name, file, file_path, file_data',
        include: {
          file_data: {
            url: '/:themes:configs/{id}/file/data',
            conditions: {
              type: 'theme',
              // Do not expand non-text data
              file: {
                $and: [
                  { content_type: { $regex: '^(?!image)' } },
                  { content_type: { $regex: '^(?!video)' } },
                ],
              },
              // Do not expand assets unless they end with .liquid.[ext]
              file_path: {
                $and: [
                  { $regex: '^(?!theme/assets/)' },
                  { $regex: '(?!.liquid.[a-zA-Z0-9]+)$' },
                ],
              },
            },
          },
        },
      });
    });
  }

  async getThemeConfig(filePath: string): Promise<SwellThemeConfig | null> {
    if (!this.swell.swellHeaders['theme-id']) {
      return null;
    }
    return await this.swell.getCached('theme-config', [filePath], async () => {
      const configs = await this.getAllThemeConfigs();
      return (
        (configs?.results?.find(
          (config: SwellRecord) => config.file_path === filePath,
        ) as SwellThemeConfig) || null
      );
    });
  }

  async getThemeTemplateConfig(
    filePath: string,
  ): Promise<SwellThemeConfig | null> {
    // Explicit extension
    if (filePath.endsWith('.json') || filePath.endsWith('.liquid')) {
      return await this.getThemeConfig(filePath);
    }

    // Try to find a JSON template first
    const jsonTemplate = await this.getThemeConfig(`${filePath}.json`);
    if (jsonTemplate) {
      return jsonTemplate;
    }

    return await this.getThemeConfig(`${filePath}.liquid`);
  }

  async getThemeTemplateConfigByType(
    type: string,
    name: string,
  ): Promise<SwellThemeConfig | null | undefined> {
    const templatesByPriority = [
      `${type}/${name}`,
      ...(this.shopifyCompatibility
        ? [this.shopifyCompatibility.getThemeFilePath(type, name)]
        : []),
    ];

    for (const filePath of templatesByPriority) {
      const templateConfig = await this.getThemeTemplateConfig(
        `theme/${filePath}`,
      );
      if (templateConfig) {
        return templateConfig;
      }
    }
  }

  async getThemeFileValue(filePath: string): Promise<string | null> {
    const config = await this.getThemeConfig(filePath);

    if (config?.file_path?.endsWith('.json')) {
      try {
        return JSON.parse(config.file_data);
      } catch (err) {
        return null;
      }
    }

    return config?.file_data || null;
  }

  getAssetUrl(filePath: string): string | null {
    const configs = this.swell.getCachedSync('theme-configs-all');

    const assetConfig =
      configs?.results?.find(
        (config: SwellRecord) =>
          // Asset support both inside and outside theme folder
          config.file_path === `theme/assets/${filePath}` ||
          config.file_path === `assets/${filePath}`,
      ) || null;

    return assetConfig?.file?.url || null;
  }

  async renderTemplate(
    config: SwellThemeConfig | null,
    data?: SwellData,
  ): Promise<string> {
    const template = config?.file_data || null;

    if (config === null) {
      return '';
    } else if (template === null) {
      return `<!-- template not found: ${config.file_path} -->`;
    }

    try {
      return await this.liquidSwell.engine.parseAndRender(template, data);
    } catch (err: any) {
      console.error(err);
      return `<!-- template render error: ${err.message} -->`;
    }
  }

  async renderTemplateString(
    templateString: string,
    data?: SwellData,
  ): Promise<string> {
    try {
      return await this.liquidSwell.engine.parseAndRender(templateString, {
        ...data,
      });
    } catch (err: any) {
      console.error(err);
      return ``;
    }
  }

  async getSectionSchema(
    sectionName: string,
  ): Promise<ThemeSectionSchema | undefined> {
    const config = await this.getThemeTemplateConfigByType(
      'sections',
      sectionName,
    );
    if (config?.file_path?.endsWith('.json')) {
      try {
        return JSON.parse(config.file_data) || undefined;
      } catch {
        // noop
      }
    } else if (config?.file_path?.endsWith('.liquid')) {
      // Fallback to the liquid file schema
      if (this.shopifyCompatibility) {
        this.liquidSwell.lastSchema = undefined;

        await this.renderTemplate(config);

        const schema = this.liquidSwell.lastSchema;
        if (schema) {
          const result = this.shopifyCompatibility.getSectionConfig(schema);
          return result;
        }
      }
    }
  }

  async renderThemeTemplate(
    filePath: string,
    data?: SwellData,
  ): Promise<string | ThemeSectionGroup> {
    const config = await this.getThemeTemplateConfig(filePath);
    const content = await this.renderTemplate(config, {
      ...data,
      template: config,
    });

    if (content && config?.file_path?.endsWith('.json')) {
      try {
        return JSON.parse(content);
      } catch (err) {
        throw new PageError();
      }
    }

    return content;
  }

  async renderLayoutTemplate(name: string, data?: SwellData): Promise<string> {
    const templateConfig = await this.getThemeTemplateConfigByType(
      'layouts',
      name,
    );

    if (templateConfig) {
      const content = await this.renderThemeTemplate(
        templateConfig.file_path,
        data,
      );
      return typeof content === 'string'
        ? content
        : `<!-- invalid layout: ${name}--> {{ content_for_layout }}`;
    }

    throw new Error(`Layout template not found: ${name}`);
  }

  async renderPageTemplate(
    name: string,
    data?: SwellData,
    altTemplateId?: string,
  ): Promise<string | ThemeSectionGroup> {
    let templateConfig;
    if (altTemplateId) {
      templateConfig = await this.getThemeTemplateConfigByType(
        'pages',
        `${name}.${altTemplateId}`,
      );
    }

    templateConfig =
      templateConfig ||
      (await this.getThemeTemplateConfigByType('pages', name));
    if (templateConfig) {
      return await this.renderThemeTemplate(templateConfig.file_path, data);
    }

    throw new Error(`Page template not found: ${name}`);
  }

  async renderPage(
    pageData?: SwellData,
    altTemplateId?: string,
  ): Promise<string | ThemeSectionGroup> {
    // Set page data as globals
    if (pageData) this.setGlobals(pageData);

    if (this.page?.id) {
      return await this.renderPageTemplate(
        this.page.id,
        pageData,
        altTemplateId,
      );
    } else {
      return await this.renderPageTemplate('404', pageData);
    }
  }

  async renderLayout(data?: SwellData): Promise<string> {
    if (this.liquidSwell.layoutName) {
      return await this.renderLayoutTemplate(this.liquidSwell.layoutName, data);
    } else {
      // Render content directly when layout is `none`
      return data?.content_for_layout || '';
    }
  }

  getContentForHeader(): string {
    let content = '\n';

    // Include google font stylesheet for all font settings
    content += this.renderFontHeaderLinks();

    if (this.shopifyCompatibility) {
      content += `\n${this.shopifyCompatibility.getContentForHeader()}`;
    }

    return content;
  }

  renderFontHeaderLinks() {
    const themeSettings = this.globals?.configs?.theme;
    const editorSettings = this.globals?.configs?.editor?.settings || [];

    if (themeSettings && editorSettings) {
      const fontSettings = findThemeSettingsByType(
        'font_family',
        themeSettings,
        editorSettings,
      );

      const combinedFonts: string[] = [];
      for (let i = 0; i < fontSettings.length; i++) {
        const value = fontSettings[i].value;
        // Adapt shopify fonts first if applicable
        if (this.shopifyCompatibility) {
          const fontSetting =
            this.shopifyCompatibility.getFontFromShopifySetting(value);
          if (!combinedFonts.includes(fontSetting || value)) {
            combinedFonts.push(fontSetting || value);
          }
        } else if (!combinedFonts.includes(value)) {
          combinedFonts.push(value);
        }
      }

      if (fontSettings.length > 0) {
        const fontUrl = ThemeFont.combinedGoogleFontUrl(combinedFonts);
        return `<link href="${fontUrl}" rel="stylesheet">`;
      }
    }

    return '';
  }

  async getSectionGroupConfigs(
    sectionGroup: ThemeSectionGroup,
  ): Promise<ThemeSectionGroupConfig[]> {
    return await getSectionGroupConfigs(sectionGroup, (type) =>
      this.getSectionSchema(type),
    );
  }

  async getPageSections(): Promise<any[]> {
    // TODO: type
    const configs = await this.getAllThemeConfigs();
    return getPageSections(configs);
  }

  async getLayoutSectionGroups(): Promise<any[]> {
    // TODO: type
    const configs = await this.getAllThemeConfigs();
    return getLayoutSectionGroups(configs);
  }

  async renderPageSections(
    sectionGroup: ThemeSectionGroup,
    data: SwellData,
  ): Promise<ThemeSectionGroupConfig[]> {
    const sectionConfigs = await this.getSectionGroupConfigs(sectionGroup);
    return this.renderSectionConfigs(sectionConfigs, data);
  }

  async renderSectionConfigs(
    sectionConfigs: ThemeSectionGroupConfig[],
    data: SwellData,
  ): Promise<ThemeSectionGroupConfig[]> {
    return await Promise.all(
      sectionConfigs.map((sectionConfig: ThemeSectionGroupConfig) => {
        const { section, schema } = sectionConfig;
        let { settings } = sectionConfig;

        if (schema?.settings && this.globals) {
          settings = resolveSectionSettings(this, sectionConfig);
        }

        return new Promise(async (resolve) => {
          const templateConfig = await this.getThemeTemplateConfigByType(
            'sections',
            `${section.type}.liquid`,
          );
          const output = templateConfig
            ? await this.renderTemplate(templateConfig, {
                ...data,
                ...settings,
                template: templateConfig,
              })
            : '';

          resolve({
            ...sectionConfig,
            output,
          });
        }) as Promise<ThemeSectionGroupConfig>;
      }),
    );
  }

  async renderTemplateSections(
    sectionGroup: ThemeSectionGroup,
    data: SwellData,
  ) {
    const sectionConfigs = await this.renderPageSections(sectionGroup, data);

    return sectionConfigs
      .map(
        (section: any) =>
          `<${section.tag} ${section.class ? `class="${section.class}"` : ''}>${section.output}</${section.tag}>`,
      )
      .join('\n');
  }

  async renderLanguage(key: string, data?: any): Promise<string> {
    if (key === undefined) {
      return '';
    }

    const lang = this.globals?.language;
    const localeCode = String(this.globals?.store?.locale || '') || 'en-US';
    const keyParts = key?.split('.') || [];
    const keyName = keyParts.pop() || '';
    const keyPath = keyParts.join('.');
    const langObject = get(lang, keyPath);

    let localeValue =
      get(langObject?.[localeCode], keyName) ||
      get(langObject?.[localeCode.split('-')[0]], keyName) ||
      langObject?.[keyName];

    // Plural vs singular language
    if (data?.count !== undefined && localeValue?.one) {
      localeValue = data.count === 1 ? localeValue.one : localeValue.other;
    }

    if (typeof localeValue !== 'string') {
      return '';
    }

    return await this.renderTemplateString(localeValue, data);
  }

  renderCurrency(amount: number, params: any): string {
    // FIXME: Total hack because on the client side the currency is getting set to `[object Promise]` for some reason
    const settingState = (this.swell.storefront.settings as any).state;
    const code = ((this.swell.storefront.currency as any).code =
      settingState?.store?.currency || 'USD');
    (this.swell.storefront.currency as any).locale =
      settingState?.store?.locale || 'en-US';
    (this.swell.storefront.currency as any).state =
      settingState?.store?.locales?.find(
        (locale: any) => locale.code === code,
      ) || { code };

    return this.swell.storefront.currency.format(amount, params);
  }
}

export class PageError {
  public statusCode: number = 500;
  public title: string;
  public template: string;

  constructor(
    title: string = 'Something went wrong',
    template: string = '500',
  ) {
    this.title = title;
    this.template = template;
  }
}

export class PageNotFound extends PageError {
  constructor(title: string = 'Page not found', template: string = '404') {
    super(title, template);
    this.statusCode = 404;
  }
}

export function resolveSectionSettings(
  theme: SwellTheme,
  sectionConfig: ThemeSectionGroupConfig,
): ThemeSettings | undefined {
  const { settings, schema } = sectionConfig;

  if (!settings?.section?.settings || !schema?.settings) {
    return settings;
  }

  const editorSettings: ThemeSettingSectionSchema[] = [
    {
      label: sectionConfig.id,
      fields: schema.settings,
    },
  ];

  return {
    ...settings,
    section: {
      ...settings.section,
      settings: resolveThemeSettings(
        theme,
        settings.section.settings,
        editorSettings,
      ),
    },
  };
}

export function resolveThemeSettings(
  theme: SwellTheme,
  themeSettings: ThemeSettings,
  editorSchemaSettings?: ThemeSettingSectionSchema[],
): ThemeSettings {
  const settings = clone(themeSettings);
  each(settings, (value, key) => {
    const setting =
      editorSchemaSettings && findEditorSetting(editorSchemaSettings, key);
    if (isObject(value)) {
      // Object-based setting types
      switch (setting?.type) {
        case 'color_scheme_group':
          each(value, (_, schemeId) => {
            each(value[schemeId].settings, (colorValue, colorId) => {
              if (colorValue) {
                value[schemeId].settings[colorId] = new ThemeColor(colorValue);
              }
            });
          });
          return;
        default:
          break;
      }
      // Nested settings
      settings[key] = resolveThemeSettings(theme, value, editorSchemaSettings);
    } else {
      switch (setting?.type) {
        case 'lookup':
        case 'product_lookup':
        case 'category_lookup':
        case 'customer_lookup':
          settings[key] = theme.resolveLookupSetting(setting, value);
          break;
        case 'color':
          if (value) {
            settings[key] = new ThemeColor(value);
          }
          break;
        case 'font_family':
          settings[key] = theme.resolveFontSetting(value);
          break;
        case 'menu':
          settings[key] = theme.resolveMenuSetting(value);
          break;
      }
    }
  });

  return settings;
}

export function findThemeSettingsByType(
  type: string,
  themeSettings: ThemeSettings,
  editorSchemaSettings: ThemeSettingSectionSchema[],
): Array<{ setting: any; value: any }> {
  const foundSettings: Array<{ setting: any; value: any }> = [];

  each(themeSettings, (value, key) => {
    if (isObject(value)) {
      // Nested settings
      foundSettings.push(
        ...findThemeSettingsByType(type, value, editorSchemaSettings),
      );
    } else {
      const setting = findEditorSetting(editorSchemaSettings, key);
      if (setting?.type === type) {
        foundSettings.push({ setting, value });
      }
    }
  });

  return foundSettings;
}

export function resolveLookupCollection(
  setting: ThemeSettingFieldSchema,
): string | null | undefined {
  if (setting.collection) {
    return setting.collection;
  }
  switch (setting.type) {
    case 'product_lookup':
      return 'products';
    case 'category_lookup':
      return 'categories';
    case 'customer_lookup':
      return 'accounts';
  }
}

export function findEditorSetting(
  editorSchemaSettings: ThemeSettingSectionSchema[],
  key: string,
) {
  for (const section of editorSchemaSettings || []) {
    for (const field of section.fields) {
      if (field.id === key) {
        return field;
      }
    }
  }
}

// TODO: move this to a better location after the Swell theme API is made into a separate library
class SwellStorefrontShopifyCompatibility extends ShopifyCompatibility {
  getPageType(pageId: string) {
    switch (pageId) {
      case 'index':
        return 'index';
      case 'products/product':
        return 'product';
      case 'products/index':
        return 'collection';
      case 'categories/category':
        return 'collection';
      case 'categories/index':
        return 'list-collections';
      case 'pages/page':
        return 'page';
      case 'content/entry':
        return 'metaobject';
      case 'blogs/index':
        return 'blog';
      case 'blogs/blog':
        return 'article';
      case 'account/index':
        return 'customers/account';
      case 'account/activate':
        return 'customers/activate_account';
      case 'account/addresses':
        return 'customers/addresses';
      case 'account/login':
        return 'customers/login';
      case 'account/orders/order':
        return 'customers/order';
      case 'account/signup':
        return 'customers/register';
      case 'account/recover':
        return 'customers/reset_password';
      case 'cart':
        return 'cart';
      case '404':
        return '404';
      case 'giftcard':
        return 'gift_card';
      case 'search':
        return 'search';
      default:
        return pageId;
    }
  }
}