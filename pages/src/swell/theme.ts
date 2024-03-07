import { AstroGlobal } from "astro";
import storefrontConfig from "../../storefront.json";
import { Swell, SwellData, SwellRecord, SwellCollection } from "./api";
import {
  LiquidSwell,
  ThemeConfig,
  ThemeBlock,
  ThemeSection,
  ThemeSectionGroup,
  ThemeSettings,
} from "./liquid-next";
import { resolveMenus } from "./menus";

export class SwellTheme {
  private swell: Swell;
  private liquidSwell: LiquidSwell;
  private globals: ThemeSettings = {};

  public page: SwellRecord | null = null;
  public pageId: string | undefined;

  constructor(swell: Swell) {
    this.swell = swell;
    this.liquidSwell = new LiquidSwell({
      storefrontConfig,
      getThemeConfig: this.getThemeConfig.bind(this),
      renderTemplate: this.renderTemplate.bind(this),
      renderTemplateString: this.renderTemplateString.bind(this),
      renderTemplateSections: this.renderTemplateSections.bind(this),
      getAssetUrl: this.getAssetUrl.bind(this),
    });
  }

  async init(Astro: AstroGlobal, pageId?: string) {
    const page = storefrontConfig.pages.find(
      (page: SwellRecord) => page.id === pageId,
    );

    if (page) {
      this.page = {
        ...page,
        url: Astro.url.pathname,
      };
    }

    this.pageId = pageId;

    await this.initGlobals();
  }

  async initGlobals(): Promise<void> {
    const globals = await this.swell.getCached("theme-globals", async () => {
      const settings = await this.swell.getStorefrontSettings();

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

      const resolvedMenus = resolveMenus(configs?.menus);

      return {
        ...settings,
        settings: configs?.theme,
        language: configs?.language,
        menus: resolvedMenus,
      };
    });

    this.globals = globals;
    this.liquidSwell.globals = globals;
  }

  async lang(key: string, defaultValue?: string): Promise<string> {
    return await this.liquidSwell.renderLanguageValue(key, defaultValue);
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

    const tpl = this.swell.getCachedSync(
      "parsed-theme-template",
      [config.file_path],
      () => this.liquidSwell.engine.parse(template),
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
    data?: SwellData,
  ): Promise<string> {
    const tpl = this.swell.getCachedSync(
      "parsed-theme-template",
      [templateString],
      () => this.liquidSwell.engine.parse(templateString),
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
      page: this.page,
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
    if (this.page) {
      return await this.renderPageTemplate(this.page.id, data, altTemplateId);
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

  async renderSectionData(sectionGroup: ThemeSectionGroup, data: SwellData) {
    const order =
      sectionGroup.order instanceof Array
        ? sectionGroup.order
        : Object.keys(sectionGroup.sections || {});

    const sections = await Promise.all(
      order.map(
        (
          key: string,
        ): Promise<{
          output: string | ThemeSectionGroup;
          schema?: ThemeSettings;
          section: ThemeSection;
          tag: string;
          class?: string;
        }> => {
          return new Promise(async (resolve) => {
            const section: ThemeSection = sectionGroup.sections[key];

            const blockOrder =
              section.block_order instanceof Array
                ? section.block_order
                : Object.keys(section.blocks || {});
            const blocks: ThemeBlock[] = await Promise.all(
              blockOrder.map((key: string) => section.blocks[key]),
            );

            try {
              const [schema, output] = await Promise.all([
                this.getSectionSchema(section.type),
                this.renderThemeTemplate(`sections/${section.type}.liquid`, {
                  ...data,
                  section: {
                    ...section,
                    blocks,
                  },
                }),
              ]);

              resolve({
                section,
                schema,
                output,
                tag: schema?.tag || "div",
                class: schema?.class,
              });
            } catch (err: any) {
              console.log(err);
              resolve({
                section,
                output: `<!-- error rendering section: ${section?.type || key} -->`,
                tag: "Fragment",
              });
            }
          });
        },
      ),
    );

    return sections;
  }

  async renderTemplateSections(
    sectionGroup: ThemeSectionGroup,
    data: SwellData,
  ) {
    const sections = await this.renderSectionData(sectionGroup, data);

    return sections
      .map(
        (section) =>
          `<${section.tag} ${section.class ? `class="${section.class}"` : ""}>${section.output}</${section.tag}>`,
      )
      .join("\n");
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