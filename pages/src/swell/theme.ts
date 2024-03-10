import clone from "lodash/clone";
import get from "lodash/get";
import { AstroGlobal } from "astro";
import storefrontConfig from "../../storefront.json";
import { Swell, SwellData, SwellRecord, SwellCollection } from "./api";
import {
  LiquidSwell,
  ThemeConfig,
  ThemeBlock,
  ThemeSection,
  ThemeSectionGroup,
  ThemeSectionConfig,
  ThemeSettings,
  ThemeGlobals,
  ThemeColor,
} from "./liquid-next";
import { ShopifyCompatibility } from "./shopify";
import { Menu, resolveMenuSettings } from "./menus";
import { themeConfigQuery, getSectionGroupConfigs, isObject } from "./utils";

export * from "./liquid-next/types";

export class SwellTheme {
  private swell: Swell;
  private liquidSwell: LiquidSwell;

  public url: string | undefined;
  public pageId: string | undefined;
  public globals: ThemeSettings = {};
  public request: ThemeSettings | null = null;

  constructor(swell: Swell) {
    this.swell = swell;
    this.liquidSwell = new LiquidSwell({
      storefrontConfig,
      getThemeConfig: this.getThemeConfig.bind(this),
      renderTemplate: this.renderTemplate.bind(this),
      renderTemplateString: this.renderTemplateString.bind(this),
      renderTemplateSections: this.renderTemplateSections.bind(this),
      renderLanguage: this.lang.bind(this),
      renderCurrency: this.renderCurrency.bind(this),
      getAssetUrl: this.getAssetUrl.bind(this),
    });
  }

  async init(Astro: AstroGlobal, pageId?: string) {
    this.pageId = pageId;
    this.url = Astro.url.pathname;

    const { store, configs } = await this.getSettingsAndConfigs();
    const { settings, menus, page } = await this.resolvePageData(
      configs,
      pageId,
    );

    this.setGlobals(Astro, {
      store,
      settings,
      menus,
      page,
      language: configs?.language,
      canonical_url: `${store.url}${this.url}`,
      // Experimental flag to enable Shopify compatibility in sections and tags/filters
      shopify_compat: Boolean(settings.$shopify_compatibility),
    });
  }

  async getSettingsAndConfigs(): Promise<{ store: SwellData; configs: any }> {
    return await this.swell.getCached("theme-globals", async () => {
      const storefrontSettings = await this.swell.getStorefrontSettings();

      const settingConfigs = await this.getAllThemeConfigs();

      const configs = settingConfigs?.results
        ?.filter((config: SwellRecord) =>
          config?.file_path?.startsWith("theme/config/"),
        )
        .reduce((acc: object, config: SwellRecord): { [key: string]: any } => {
          const configName = config.name.split(".")[0];
          let configValue;
          if (config?.file_path?.endsWith(".json")) {
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
        }, {});

      return { store: storefrontSettings?.store, configs };
    });
  }

  resolvePageData(
    configs: SwellData,
    pageId?: string,
  ): {
    settings: ThemeSettings;
    menus: { [key: string]: Menu };
    page: ThemeSettings;
  } {
    return this.swell.getCachedSync(
      "theme-settings-resolved",
      [this.url, pageId],
      () => {
        return {
          settings: resolveThemeSettings(configs?.theme),
          menus: resolveMenuSettings(configs?.menus, {
            currentUrl: this.url,
          }),
          page: storefrontConfig.pages.find(
            (page: ThemeSettings) => page.id === pageId,
          ),
        };
      },
    );
  }

  setGlobals(Astro: AstroGlobal, globals: ThemeGlobals) {
    if (globals.shopify_compat) {
      ShopifyCompatibility.applyGlobals(Astro, this.swell, globals);
    }

    this.globals = {
      ...this.globals,
      ...globals,
    };
    this.liquidSwell.globals = this.globals;
    this.liquidSwell.engine.options.globals = this.globals;
  }

  async lang(key: string, defaultValue?: string): Promise<string> {
    return await this.renderLanguage(key, defaultValue);
  }

  themeConfigQuery() {
    const { swellHeaders } = this.swell;
    return themeConfigQuery(swellHeaders);
  }

  async getAllThemeConfigs(): Promise<SwellCollection | null> {
    if (!this.swell.swellHeaders["theme-id"]) {
      return null;
    }
    return await this.swell.getCached("theme-configs-all", async () => {
      return await this.swell.get("/:themes:configs", {
        ...this.themeConfigQuery(),
        limit: 1000,
        fields: "type, name, file, file_path, file_data",
        include: {
          file_data: {
            url: "/:themes:configs/{id}/file/data",
            conditions: {
              type: "theme",
              // Do not expand non-text data
              file: {
                $and: [
                  { content_type: { $regex: "^(?!image)" } },
                  { content_type: { $regex: "^(?!video)" } },
                ],
              },
            },
          },
        },
      });
    });
  }

  async getThemeConfig(filePath: string): Promise<ThemeConfig | null> {
    if (!this.swell.swellHeaders["theme-id"]) {
      return null;
    }
    return await this.swell.getCached("theme-config", [filePath], async () => {
      const configs = await this.getAllThemeConfigs();
      return (
        (configs?.results?.find(
          (config: SwellRecord) => config.file_path === filePath,
        ) as ThemeConfig) || null
      );
    });
  }

  async getThemeTemplateConfig(filePath: string): Promise<ThemeConfig | null> {
    // Explicit extension
    if (filePath.endsWith(".json") || filePath.endsWith(".liquid")) {
      return await this.getThemeConfig(filePath);
    }

    // Try to find a JSON template first
    const jsonTemplate = await this.getThemeConfig(`${filePath}.json`);
    if (jsonTemplate) {
      return jsonTemplate;
    }

    return await this.getThemeConfig(`${filePath}.liquid`);
  }

  async getThemeFileValue(filePath: string): Promise<string | null> {
    const config = await this.getThemeConfig(filePath);

    if (config?.file_path?.endsWith(".json")) {
      try {
        return JSON.parse(config.file_data);
      } catch (err) {
        return null;
      }
    }

    return config?.file_data || null;
  }

  getAssetUrl(filePath: string): string | null {
    const configs = this.swell.getCachedSync("theme-configs-all");

    const assetConfig =
      configs?.results?.find(
        (config: SwellRecord) => config.file_path === `assets/${filePath}`,
      ) || null;

    return assetConfig?.file?.url || null;
  }

  async renderTemplate(
    config: ThemeConfig | null,
    data?: SwellData,
  ): Promise<string> {
    const template = config?.file_data || null;

    if (config === null) {
      return "";
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
  ): Promise<ThemeSettings | undefined> {
    const config = await this.getThemeTemplateConfig(
      `theme/sections/${sectionName}.json`,
    );

    if (config) {
      try {
        return JSON.parse(config.file_data);
      } catch (err) {
        // noop
      }
    }
  }

  async renderThemeTemplate(
    filePath: string,
    data?: SwellData,
  ): Promise<string | ThemeSectionGroup> {
    const config = await this.getThemeTemplateConfig(`theme/${filePath}`);
    const content = await this.renderTemplate(config, {
      ...data,
      template: config,
    });

    if (content && config?.file_path?.endsWith(".json")) {
      try {
        return JSON.parse(content);
      } catch (err) {
        throw new PageError();
      }
    }

    return content;
  }

  async renderLayoutTemplate(name: string, data?: SwellData): Promise<string> {
    const content = await this.renderThemeTemplate(
      `layouts/${name}.liquid`,
      data,
    );
    return typeof content === "string"
      ? content
      : `<!-- invalid layout: ${name}--> {{ content_for_layout }}`;
  }

  async renderPageTemplate(
    name: string,
    data?: SwellData,
    altTemplateId?: string,
  ): Promise<string | ThemeSectionGroup> {
    // If an alternate template used, try to render it first or fall back to the default
    if (altTemplateId) {
      const themeFilePath = `pages/${name}.${altTemplateId}`;
      const configFilePath = `theme/${themeFilePath}`;
      const templateConfig = await this.getThemeTemplateConfig(configFilePath);
      if (templateConfig) {
        return await this.renderThemeTemplate(themeFilePath, data);
      }
    }

    return await this.renderThemeTemplate(`pages/${name}`, data);
  }

  async renderPage(
    data?: SwellData,
    altTemplateId?: string,
  ): Promise<string | ThemeSectionGroup> {
    if (this.pageId) {
      return await this.renderPageTemplate(this.pageId, data, altTemplateId);
    } else {
      return await this.renderPageTemplate("404", data);
    }
  }

  async renderLayout(data?: SwellData): Promise<string> {
    if (this.liquidSwell.layoutName) {
      return await this.renderLayoutTemplate(this.liquidSwell.layoutName, data);
    } else {
      // Render content directly when layout is `none`
      return data?.content_for_layout || "";
    }
  }

  async getSectionConfigs(
    sectionGroup: ThemeSectionGroup,
  ): Promise<ThemeSectionConfig[]> {
    return await getSectionGroupConfigs(sectionGroup, (type) =>
      this.getSectionSchema(type),
    );
  }

  async renderSections(sectionGroup: ThemeSectionGroup, data: SwellData): Promise<ThemeSectionConfig[]> {
    const sectionConfigs = await this.getSectionConfigs(sectionGroup);
    return this.renderSectionConfigs(sectionConfigs, data);
  }

  async renderSectionConfigs(sectionConfigs: ThemeSectionConfig[], data: SwellData): Promise<ThemeSectionConfig[]> {
    return await Promise.all(
      sectionConfigs.map((sectionConfig: ThemeSectionConfig) => {
        const { section, settings } = sectionConfig;
        return new Promise(async (resolve) => {
          const output = await this.renderThemeTemplate(
            `sections/${section.type}.liquid`,
            {
              ...data,
              ...settings,
            }
          ) as string;
          
          resolve({
            ...sectionConfig,
            output,
          });
        }) as Promise<ThemeSectionConfig>;
      })
    );
  }

  async renderTemplateSections(
    sectionGroup: ThemeSectionGroup,
    data: SwellData,
  ) {
    const sectionConfigs = await this.renderSections(sectionGroup, data);

    return sectionConfigs
      .map(
        (section: any) =>
          `<${section.tag} ${section.class ? `class="${section.class}"` : ""}>${section.output}</${section.tag}>`,
      )
      .join("\n");
  }

  async renderLanguage(
    key: string,
    defaultValue?: string,
  ): Promise<string> {
    if (key === undefined) {
      return "";
    }

    const lang = this.globals?.language;
    const localeCode = String(this.globals?.store?.locale || "") || "en-US";
    const keyParts = key?.split(".") || [];
    const keyName = keyParts.pop() || "";
    const keyPath = keyParts.join(".");
    const langObject = get(lang, keyPath);

    const localeValue =
      get(langObject?.[localeCode], keyName) ||
      get(langObject?.[localeCode.split("-")[0]], keyName) ||
      langObject?.[keyName] ||
      defaultValue;

    if (typeof localeValue !== "string") {
      return "";
    }

    return await this.renderTemplateString(localeValue);
  }

  renderCurrency(amount: number, params: any): string {
    return this.swell.storefront.currency.format(amount, params);
  }
}

export class PageError {
  public statusCode: number = 500;
  public title: string;
  public template: string;

  constructor(
    title: string = "Something went wrong",
    template: string = "500",
  ) {
    this.title = title;
    this.template = template;
  }
}

export class PageNotFound extends PageError {
  constructor(title: string = "Page not found", template: string = "404") {
    super(title, template);
    this.statusCode = 404;
  }
}

export function resolveThemeSettings(
  themeSettings: ThemeSettings,
): ThemeSettings {
  const theme = clone(themeSettings);
  if (isObject(theme)) {
    for (const key in theme) {
      const value = theme[key];
      if (isObject(value)) {
        theme[key] = resolveThemeSettings(value);
      } else if (
        typeof value === "string" &&
        (value.startsWith("#") || value.startsWith("rgb"))
      ) {
        theme[key] = new ThemeColor(value);
      }
    }
  }
  return theme;
}
