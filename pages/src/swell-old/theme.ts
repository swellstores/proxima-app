import clone from "lodash/clone";
import get from "lodash/get";
import each from 'lodash/each';
import reduce from 'lodash/reduce';
import { Swell, SwellStorefrontCollection, SwellStorefrontRecord } from './api';
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
  public storefrontConfig?: SwellStorefrontConfig;
  public liquidSwell: LiquidSwell;

  public url: URL | undefined;
  public page: any;
  public pageId: string | undefined;
  public globals: ThemeGlobals | undefined;
  public request: ThemeSettings | null = null;
  public shopifyCompatibility: any = null;
  public shopifyCompatibilityClass: typeof ShopifyCompatibility =
    ShopifyCompatibility;

  constructor(
    swell: Swell,
    options: {
      storefrontConfig?: SwellStorefrontConfig;
      shopifyCompatibilityClass?: typeof ShopifyCompatibility;
    } = {},
  ) {
    const { storefrontConfig, shopifyCompatibilityClass } = options;

    this.swell = swell;

    this.storefrontConfig = storefrontConfig;
    this.shopifyCompatibilityClass =
      shopifyCompatibilityClass || ShopifyCompatibility;

    this.liquidSwell = new LiquidSwell({
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

  async initGlobals({ url, pageId }: SwellThemeInitOptions) {
    this.pageId = pageId;
    this.url = url;

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
        storefrontConfig: this.storefrontConfig,
        language: configs?.language,
        canonical_url: `${store.url}${this.url?.pathname || ''}`,
        // Flag to enable Shopify compatibility in sections and tags/filters
        shopify_compat: Boolean(settings.$shopify_compatibility),
      },
      url,
    );
  }

  setGlobals(globals: SwellData, url?: URL) {
    // Note: All globals are set manually on the client side in the editor
    if (this.shopifyCompatibility && url) {
      this.shopifyCompatibility.adaptGlobals(globals, {
        host: url.host,
        origin: url.origin,
        path: url.pathname,
      });
    }

    this.globals = {
      ...this.globals,
      ...globals,
    };
    this.liquidSwell.globals = this.globals;
    this.liquidSwell.engine.options.globals = this.globals;
  }

  async getSettingsAndConfigs(): Promise<{
    store: SwellData;
    menus: { [key: string]: SwellMenu };
    configs: ThemeConfigs;
  }> {
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
        .reduce((acc: object, config: SwellRecord): { [key: string]: any } => {
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
        }, {}),
    };

    const localeCode = storefrontSettings?.store?.locale || 'en-US';

    this.resolveLanguageLocale(configs.language, localeCode);

    this.setCompatibilityConfigs(configs, settingConfigs, localeCode);

    // Resolve menus after compatibility is determined
    const menus = await resolveMenuSettings(
      this,
      this.swell.getStorefrontMenus(),
      {
        currentUrl: this.url?.pathname,
      },
    );

    return {
      store: storefrontSettings?.store,
      menus,
      configs,
    };
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
      [this.url?.pathname, pageId],
      () => {
        const settings = resolveThemeSettings(
          this,
          configs.theme,
          configs.editor?.settings,
        );
        return {
          settings,
          page: this.storefrontConfig?.pages?.find(
            (page: ThemeSettings) => page.id === pageId,
          ),
        };
      },
    );
  }

  resolveLanguageLocale(languageConfig: ThemeSettings, localeCode: string) {
    if (!languageConfig) {
      return {};
    }

    const localeShortCode = localeCode.split('-')[0];

    return reduce(
      languageConfig,
      (acc: any, value: any, key: string) => {
        if (isObject(value)) {
          acc[key] = this.resolveLanguageLocale(value, localeCode);
        } else {
          acc[key] =
            get(languageConfig, `$locale.${localeCode}.${key}`) ||
            get(languageConfig, `$locale.${localeShortCode}.${key}`) ||
            value;
        }
        return acc;
      },
      {},
    );
  }

  setCompatibilityConfigs(
    configs: ThemeConfigs,
    settingConfigs: SwellCollection,
    localeCode: string,
  ) {
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

    if (!Object.keys(configs.language).length) {
      configs.language = shopifyCompatibility().getLocaleConfig(
        settingConfigs,
        localeCode,
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
    if (!pageData || !this.shopifyCompatibility) {
      return;
    }
    this.shopifyCompatibility.adaptPageData(pageData);
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

  async getAllThemeConfigs(): Promise<SwellCollection> {
    // NOTE: This request is very slow through ngrok proxy
    return this.swell.getCached('theme-configs-all', async () => {
      const configs = await this.swell.get('/:themes:configs', {
        ...this.themeConfigQuery(),
        // TODO: paginate to support more than 1000 configs
        limit: 1000,
        fields: 'type, name, file, file_path, file_data',
        // Do not return assets unless they end with .liquid.[ext]
        $or: [
          { file_path: { $regex: '^(?!theme/assets/)' } },
          { file_path: { $regex: '.liquid.[a-zA-Z0-9]+$' } },
        ],
        include: {
          file_data: {
            url: '/:themes:configs/{id}/file/data',
            conditions: {
              type: 'theme',
              // Only expand config files normally
              // TODO: disabled because we need to pass all configs to client for editor
              // Enable this if we find a better strategy later
              // file_path: { $regex: 'theme/config/' },
              // Do not expand non-text data
              file: {
                $and: [
                  { content_type: { $regex: '^(?!image)' } },
                  { content_type: { $regex: '^(?!video)' } },
                ],
              },
            },
          },
        },
      });
      return configs;
    });
  }

  async getThemeConfig(filePath: string): Promise<SwellThemeConfig | null> {
    if (!this.swell.swellHeaders['theme-id']) {
      return null;
    }

    const allConfigs = await this.getAllThemeConfigs();
    const config = allConfigs?.results?.find(
      (config: any) => config.file_path === filePath,
    );

    if (config && !config.file_data) {
      config.file_data = await this.swell.getCached(
        'theme-config-filedata',
        [filePath],
        async () => {
          return await this.swell.get(
            `/:themes:configs/${config.id}/file/data`,
          );
        },
      );
    }

    return config as SwellThemeConfig;
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

    console.log('not found', templatesByPriority);
    const allConfigs = await this.getAllThemeConfigs();
    console.log({ allConfigs });
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
        console.log(
          'Unable to render theme template',
          config.file_path,
          content,
        );
        throw new PageError(err as Error);
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

  // FIXME: not done yet
  async renderSection(
    sectionId: string,
    pageData?: SwellData,
  ): Promise<string | ThemeSectionGroup> {
    // Set page data as globals
    if (pageData) this.setGlobals(pageData);

    let templateConfig = await this.getThemeTemplateConfigByType(
      'sections',
      sectionId,
    );

    if (templateConfig) {
      const sectionContent = await this.renderThemeTemplate(
        templateConfig.file_path,
        pageData,
      );
    }

    return '';
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
    return getPageSections(configs, async (config: any) => {
      if (this.shopifyCompatibility) {
        this.liquidSwell.lastSchema = undefined;
        await this.renderTemplate(config);
        const schema = this.liquidSwell.lastSchema || {};
        if (schema) {
          return this.shopifyCompatibility.getSectionConfig(schema);
        }
      }
      return {};
    });
  }

  async getLayoutSectionGroups(): Promise<any[]> {
    // TODO: type
    const configs = await this.getAllThemeConfigs();
    // TODO: de-dupe with getPageSections
    let layoutSectionGroups = await getLayoutSectionGroups(
      configs,
      async (config: any) => {
        if (this.shopifyCompatibility) {
          this.liquidSwell.lastSchema = undefined;
          await this.renderTemplate(config);
          const schema = this.liquidSwell.lastSchema || {};
          if (schema) {
            return this.shopifyCompatibility.getSectionConfig(schema);
          }
        }
        return {};
      },
    );

    // Resolve section config settings
    for (const layoutSectionGroup of layoutSectionGroups) {
      for (const sectionConfig of layoutSectionGroup.sectionConfigs) {
        const { schema } = sectionConfig;
        if (schema?.settings && this.globals) {
          // TODO: this is nested in section property so it doesn't work
          // FIXME
          sectionConfig.settings = resolveSectionSettings(this, sectionConfig);
        }
      }
    }

    return layoutSectionGroups;
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
  public message: string | Error;
  public template: string;

  constructor(
    title: string | Error = 'Something went wrong',
    template: string = '500',
  ) {
    this.message = String(title);
    this.template = template;
  }

  toString() {
    return this.message;
  }
}

export class PageNotFound extends PageError {
  constructor(message: string = 'Page not found', template: string = '404') {
    super(message, template);
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