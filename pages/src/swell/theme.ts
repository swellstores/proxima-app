import { AstroGlobal } from "astro";
import storefrontConfig from "../../storefront.json";
import { Swell, SwellData, SwellRecord, SwellCollection } from "./api";
import { LiquidSwell, ThemeConfig } from "./liquid-next";

export class SwellTheme {
  private swell: Swell;
  private liquidSwell: LiquidSwell;
  private globals: SwellData = {};

  public page: SwellRecord | null = null;

  constructor(swell: Swell) {
    this.swell = swell;
    this.liquidSwell = new LiquidSwell({
      swell,
      storefrontConfig,
      getThemeConfig: this.getThemeConfig.bind(this),
      renderTemplate: this.renderTemplate.bind(this),
      renderTemplateString: this.renderTemplateString.bind(this),
      getAssetUrl: this.getAssetUrl.bind(this),
    });
  }

  async init(Astro: AstroGlobal, pageId?: string) {
    const page = storefrontConfig.pages.find(
      (page: SwellRecord) => page.id === pageId
    );
    console.log({ pageId, page });
    if (page) {
      this.page = {
        ...page,
        url: Astro.url.pathname,
      };
      console.log(this.page);
    }

    await this.initGlobals();
  }

  async initGlobals(): Promise<void> {
    const globals = await this.swell.getCached("theme-globals", async () => {
      const settings = await this.swell.getStorefrontSettings();

      const settingConfigs = await this.getAllThemeConfigs();

      const configs = settingConfigs?.results
        ?.filter((config: SwellRecord) =>
          config?.file_path?.startsWith("theme/config/")
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

      return {
        ...settings,
        settings: configs?.theme,
        language: configs?.language,
      };
    });

    this.globals = globals;
    this.liquidSwell.globals = globals;
  }

  themeConfigQuery() {
    const { swellHeaders } = this.swell;
    return {
      parent_id: swellHeaders["theme-id"],
      branch_id: swellHeaders["theme-branch-id"] || null,
      preview:
        swellHeaders["deployment-mode"] === "preview" ? true : { $ne: true },
    };
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
          (config: SwellRecord) => config.file_path === filePath
        ) as ThemeConfig) || null
      );
    });
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
        (config: SwellRecord) => config.file_path === `assets/${filePath}`
      ) || null;

    return assetConfig?.file?.url || null;
  }

  async renderTemplate(
    config: ThemeConfig | null,
    data?: SwellData
  ): Promise<string> {
    const template = config?.file_data || null;

    if (config === null) {
      return "";
    } else if (template === null) {
      return `<!-- template not found: ${config.file_path} -->`;
    }

    const tpl = this.swell.getCachedSync(
      "parsed-theme-template",
      [config.file_path],
      () => this.liquidSwell.engine.parse(template)
    );

    try {
      return await this.liquidSwell.engine.render(tpl, {
        ...data,
        ...this.globals,
      });
    } catch (err: any) {
      console.error(err);
      return `<!-- template render error: ${err.message} -->`;
    }
  }

  async renderTemplateString(
    templateString: string,
    data?: SwellData
  ): Promise<string> {
    const tpl = this.swell.getCachedSync(
      "parsed-theme-template",
      [templateString],
      () => this.liquidSwell.engine.parse(templateString)
    );

    try {
      return await this.liquidSwell.engine.render(tpl, {
        ...data,
        ...this.globals,
      });
    } catch (err: any) {
      console.error(err);
      return ``;
    }
  }

  async renderThemeTemplate(
    filePath: string,
    data?: SwellData
  ): Promise<string> {
    const config = await this.getThemeConfig(`theme/${filePath}`);
    const content = await this.renderTemplate(config, {
      ...data,
      template: config,
      page: this.page,
    });

    return content;
  }

  async renderLayoutTemplate(
    name: string,
    data?: SwellRecord
  ): Promise<string> {
    return await this.renderThemeTemplate(`layouts/${name}.liquid`, data);
  }

  async renderPageTemplate(
    name: string,
    data?: SwellData,
    templateId?: string
  ): Promise<string> {
    // If a specific template is targeted, try to render it first or fall back to the default
    if (templateId) {
      const templateFilePath = `pages/${name}.${templateId}.liquid`;
      const templateConfig = await this.getThemeConfig(
        `theme/${templateFilePath}`
      );
      if (templateConfig) {
        return await this.renderThemeTemplate(
          `pages/${templateFilePath}`,
          data
        );
      }
    }

    return await this.renderThemeTemplate(`pages/${name}.liquid`, data);
  }

  async renderPage(data?: SwellData, templateId?: string): Promise<string> {
    if (this.page) {
      return await this.renderPageTemplate(
        this.page.template,
        data,
        templateId
      );
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

  lang(key: string, defaultValue?: string): Promise<string> {
    return this.liquidSwell.renderLanguageValue(key, defaultValue);
  }
}
