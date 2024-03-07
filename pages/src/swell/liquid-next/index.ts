import _ from "lodash";
import { Liquid } from "liquidjs";
import { bindTags } from "./tags";
import { bindFilters } from "./filters";
import {
  GetThemeConfig,
  RenderTemplate,
  RenderTemplateString,
  RenderTemplateSections,
  GetAssetUrl,
  ThemeSettings,
} from "./types";

export * from "./types";

export class LiquidSwell extends Liquid {
  public storefrontConfig: any;
  public getThemeConfig: GetThemeConfig;
  public renderTemplate: RenderTemplate;
  public renderTemplateString: RenderTemplateString;
  public renderTemplateSections: RenderTemplateSections;
  public getAssetUrl: GetAssetUrl;
  public engine: Liquid;

  public layoutName: string | undefined;
  public extName: string | undefined;
  public componentsDir: string | undefined;
  public sectionsDir: string | undefined;

  public globals: ThemeSettings = {};

  constructor({
    storefrontConfig,
    getThemeConfig,
    renderTemplate,
    renderTemplateString,
    renderTemplateSections,
    getAssetUrl,
    layoutName,
    extName,
    componentsDir,
    sectionsDir,
  }: {
    storefrontConfig: ThemeSettings;
    getThemeConfig: GetThemeConfig;
    renderTemplate: RenderTemplate;
    renderTemplateString: RenderTemplateString;
    renderTemplateSections: RenderTemplateSections;
    getAssetUrl: GetAssetUrl;
    layoutName?: string;
    extName?: string;
    componentsDir?: string;
    sectionsDir?: string;
  }) {
    super();
    this.storefrontConfig = storefrontConfig;
    this.getThemeConfig = getThemeConfig;
    this.getAssetUrl = getAssetUrl;
    this.renderTemplate = renderTemplate;
    this.renderTemplateString = renderTemplateString;
    this.renderTemplateSections = renderTemplateSections;
    this.layoutName = layoutName || "theme";
    this.extName = extName || "liquid";
    this.componentsDir = componentsDir || "components";
    this.sectionsDir = sectionsDir || "sections";

    this.engine = this.initLiquidEngine();
  }

  initLiquidEngine(): Liquid {
    this.engine = new Liquid({
      cache: false,
      relativeReference: false,
      fs: this.getLiquidFS(),
    });

    bindTags(this);
    bindFilters(this);

    return this.engine;
  }

  getLiquidFS() {
    const { getThemeConfig, resolveFilePath } = this;
    return {
      /** read a file asynchronously */
      async readFile(filePath: string): Promise<string> {
        const resolvedPath = resolveFilePath(filePath);
        return await getThemeConfig(resolvedPath).then(
          (template) =>
            template?.file_data ||
            `<!-- theme template not found: ${resolvedPath} -->`,
        );
      },
      /** check if a file exists asynchronously */
      async exists(filePath: string): Promise<boolean> {
        return true;
      },
      /** read a file synchronously */
      readFileSync(_filePath: string): string {
        return "";
      },
      /** check if a file exists synchronously */
      existsSync(_filePath: string): boolean {
        return false;
      },
      /** check if file is contained in `root`, always return `true` by default. Warning: not setting this could expose path traversal vulnerabilities. */
      contains(_root: string, _file: string): boolean {
        return true;
      },
      /** resolve a file against directory, for given `ext` option */
      resolve(_dir: string, file: string, _ext: string): string {
        return file;
      },
      /** fallback file for lookup failure */
      fallback(_filePath: string): string | undefined {
        return;
      },
    };
  }

  resolveFilePath(fileName: string, extName?: string): string {
    return `theme/${fileName}.${extName || this.extName}`;
  }

  getComponentPath(componentName: string): string {
    return this.resolveFilePath(`${this.componentsDir}/${componentName}`);
  }

  getSectionPath(sectionName: string): string {
    return this.resolveFilePath(`${this.sectionsDir}/${sectionName}`);
  }

  getSectionGroupPath(sectionName: string): string {
    return this.resolveFilePath(`${this.sectionsDir}/${sectionName}`, "json");
  }

  async renderLanguageValue(
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
    const langObject = _.get(lang, keyPath);

    const localeValue =
      _.get(langObject?.[localeCode], keyName) ||
      _.get(langObject?.[localeCode.split("-")[0]], keyName) ||
      langObject?.[keyName] ||
      defaultValue;

    if (typeof localeValue !== "string") {
      return "";
    }

    return await this.renderTemplateString(localeValue);
  }

  getCurrencyValue() {}
}
