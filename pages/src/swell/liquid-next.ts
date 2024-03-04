import _ from "lodash";
import {
  Liquid,
  Hash,
  Value,
  ValueToken,
  Tag,
  TagToken,
  Template,
  Context,
  Scope,
  Emitter,
  TopLevelToken,
  TypeGuards,
  evalToken,
} from "liquidjs";
import { Swell, SwellData, SwellRecord } from "./api";
import { IdentifierToken, QuotedToken } from "liquidjs/dist/tokens";

export interface ThemeConfig extends SwellRecord {
  id: string;
  type: string;
  file_data: string;
  file_path: string;
}

type GetThemeConfig = (fileName: string) => Promise<ThemeConfig | null>;
type RenderTemplate = (
  config: ThemeConfig | null,
  data?: any
) => Promise<string>;
type RenderTemplateString = (
  templateString: string,
  data?: any
) => Promise<string>;
type GetAssetUrl = (assetPath: string) => string | null;

type LiquidSwellParams = {
  swell: Swell;
  storefrontConfig: any;
  getThemeConfig: GetThemeConfig;
  renderTemplate: RenderTemplate;
  renderTemplateString: RenderTemplateString;
  getAssetUrl: GetAssetUrl;
  instanceKey?: string;
  layoutName?: string;
  extName?: string;
  componentsDir?: string;
  sectionsDir?: string;
};

export class LiquidSwell extends Liquid {
  private swell: Swell;

  public storefrontConfig: any;
  public getThemeConfig: GetThemeConfig;
  public renderTemplate: RenderTemplate;
  public renderTemplateString: RenderTemplateString;
  public getAssetUrl: GetAssetUrl;
  public engine: Liquid;

  public layoutName: string | undefined;
  public extName: string | undefined;
  public componentsDir: string | undefined;
  public sectionsDir: string | undefined;

  public globals: SwellData = {};

  constructor({
    swell,
    storefrontConfig,
    getThemeConfig,
    renderTemplate,
    renderTemplateString,
    getAssetUrl,
    instanceKey,
    layoutName,
    extName,
    componentsDir,
    sectionsDir,
  }: LiquidSwellParams) {
    super();
    this.swell = swell;
    this.storefrontConfig = storefrontConfig;
    this.getThemeConfig = getThemeConfig;
    this.getAssetUrl = getAssetUrl;
    this.renderTemplate = renderTemplate;
    this.renderTemplateString = renderTemplateString;
    this.layoutName = layoutName || "theme";
    this.extName = extName || "liquid";
    this.componentsDir = componentsDir || "components";
    this.sectionsDir = sectionsDir || "sections";

    this.engine = this.initLiquidEngine(instanceKey);
  }

  initLiquidEngine(instanceKey?: string): Liquid {
    this.engine = this.swell.getCachedSync(
      `liquid-${instanceKey || "default"}`,
      () => {
        return new Liquid({
          cache: false,
          relativeReference: false,
          fs: this.getLiquidFS(),
        });
      }
    );

    bindSwellTags(this);
    bindSwellFilters(this);
    bindShopifyTags(this);

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
            `<!-- theme template not found: ${resolvedPath} -->`
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

  resolveFilePath(fileName: string): string {
    return `theme/${fileName}.${this.extName}`;
  }

  getComponentPath(componentName: string): string {
    return this.resolveFilePath(`${this.componentsDir}/${componentName}`);
  }

  getSectionPath(sectionName: string): string {
    return this.resolveFilePath(`${this.sectionsDir}/${sectionName}`);
  }

  async renderLanguageValue(
    key: string,
    defaultValue?: string
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

/**
 * Swell specific tags and filters for Liquid
 */

function bindSwellTags(liquidSwell: LiquidSwell) {
  // {% section 'name' %}
  liquidSwell.engine.registerTag(
    "section",
    class SectionTag extends Tag {
      private fileName: string;

      constructor(
        token: TagToken,
        remainTokens: TopLevelToken[],
        liquid: Liquid
      ) {
        super(token, remainTokens, liquid);
        const { tokenizer } = token;
        this.fileName = (tokenizer.readValue() as QuotedToken)?.content;
      }

      *render(ctx: Context): any {
        const themeConfig = yield liquidSwell.getThemeConfig(
          liquidSwell.getSectionPath(this.fileName)
        );
        return yield liquidSwell.renderTemplate(themeConfig);
      }
    }
  );

  // {% layout 'name' %}
  // {% layout none %}
  liquidSwell.engine.registerTag(
    "layout",
    class LayoutTag extends Tag {
      private fileName: string;

      constructor(
        token: TagToken,
        remainTokens: TopLevelToken[],
        liquid: Liquid
      ) {
        super(token, remainTokens, liquid);
        const { tokenizer } = token;
        this.fileName = (tokenizer.readValue() as QuotedToken)?.content;
      }

      *render(ctx: Context): any {
        // Layout is actually rendered separately
        liquidSwell.layoutName = this.fileName;
        return "";
      }
    }
  );

  // {% include 'component' %}
  liquidSwell.engine.registerTag(
    "include",
    class IncludeTag extends Tag {
      private fileName: string;
      private hash: Hash;

      // Implementation adapted from liquidjs/src/tags/include.ts
      constructor(
        token: TagToken,
        remainTokens: TopLevelToken[],
        liquid: Liquid
      ) {
        super(token, remainTokens, liquid);
        const { tokenizer } = token;
        this.fileName = (tokenizer.readValue() as QuotedToken)?.content;

        this.hash = new Hash(tokenizer.remaining());
      }

      *render(ctx: Context): any {
        const { hash } = this;

        const scope = (yield hash.render(ctx)) as Scope;
        ctx.push(scope);

        const themeConfig = yield liquidSwell.getThemeConfig(
          liquidSwell.getComponentPath(this.fileName)
        );
        const output = yield liquidSwell.renderTemplate(
          themeConfig,
          scope as { [key: string]: any }
        );

        ctx.pop();

        return output;
      }
    }
  );

  // {% render 'component', variable: value %}
  // {% render 'component' for array as item %}
  // {% render 'component' with object as name %}
  liquidSwell.engine.registerTag(
    "render",
    class RenderTag extends Tag {
      private fileName: string;
      private hash: Hash;
      private args: {
        with?: { value: ValueToken; alias?: IdentifierToken["content"] };
        for?: { value: ValueToken; alias?: IdentifierToken["content"] };
      } = {};

      constructor(
        token: TagToken,
        remainTokens: TopLevelToken[],
        liquid: Liquid
      ) {
        super(token, remainTokens, liquid);
        const tokenizer = this.tokenizer;

        this.fileName = (tokenizer.readValue() as QuotedToken)?.content;

        while (!tokenizer.end()) {
          const begin = tokenizer.p;
          const keyword = tokenizer.readIdentifier();
          if (keyword.content === "with" || keyword.content === "for") {
            tokenizer.skipBlank();
            // can be normal key/value pair, like "with: true"
            if (tokenizer.peek() !== ":") {
              const value = tokenizer.readValue();
              // can be normal key, like "with,"
              if (value) {
                const beforeAs = tokenizer.p;
                const asStr = tokenizer.readIdentifier();
                let alias;
                if (asStr.content === "as") alias = tokenizer.readIdentifier();
                else tokenizer.p = beforeAs;

                this.args[keyword.content] = {
                  value,
                  alias: alias && alias.content,
                };
                tokenizer.skipBlank();
                if (tokenizer.peek() === ",") tokenizer.advance();
                continue; // matched!
              }
            }
          }
          /**
           * restore cursor if with/for not matched
           */
          tokenizer.p = begin;
          break;
        }

        this.hash = new Hash(tokenizer.remaining());
      }

      *render(ctx: Context): any {
        const { hash } = this;

        const themeConfig = yield liquidSwell.getThemeConfig(
          liquidSwell.getComponentPath(this.fileName)
        );
        const childCtx = new Context({}, ctx.opts, {
          sync: ctx.sync,
          globals: ctx.globals,
          strictVariables: ctx.strictVariables,
        });

        const scope = childCtx.bottom() as { [key: string]: any };
        _.assign(scope, yield hash.render(ctx));

        let output = "";

        if (this.args["with"]) {
          const { value, alias } = this.args["with"];
          const aliasName = alias || this.fileName;
          scope[aliasName] = yield evalToken(value, ctx);
        }

        if (this.args["for"]) {
          const { value, alias } = this.args["for"];
          const collection = toEnumerable(yield evalToken(value, ctx));
          scope["forloop"] = new ForloopDrop(
            collection.length,
            value.getText(),
            alias as string
          ) as ForloopDrop;
          for (const item of collection) {
            scope[alias as string] = item;
            output += yield liquidSwell.renderTemplate(themeConfig, scope);

            (scope["forloop"] as ForloopDrop).next();
          }
        } else {
          output += yield liquidSwell.renderTemplate(themeConfig, scope);
        }

        return output;
      }
    }
  );
}

function bindSwellFilters(liquidSwell: LiquidSwell) {
  // {{ 'asset.css' | asset_url }}
  liquidSwell.engine.registerFilter("asset_url", (assetPath: string) => {
    return liquidSwell.getAssetUrl(assetPath) || "";
  });

  // {{ 'asset.css' | stylesheet_tag }}
  liquidSwell.engine.registerFilter("stylesheet_tag", (assetUrl: string) => {
    return `<link href="${assetUrl}" rel="stylesheet" type="text/css" media="all" />`;
  });

  // {{ 'asset.css' | t }}
  liquidSwell.engine.registerFilter(
    "t",
    async (key: string, defaultValue?: any) => {
      return await liquidSwell.renderLanguageValue(key, defaultValue);
    }
  );
}

/**
 * Shopify compatibility tags and filters
 */

function bindShopifyTags(liquidSwell: LiquidSwell) {
  // {% schema %}
  liquidSwell.engine.registerTag(
    "schema",
    class SectionTag extends Tag {
      constructor(
        token: TagToken,
        remainTokens: TopLevelToken[],
        liquid: Liquid
      ) {
        super(token, remainTokens, liquid);
        while (remainTokens.length) {
          const token = remainTokens.shift()!;
          if (TypeGuards.isTagToken(token) && token.name === "endschema")
            return;
          // noop
          liquid.parser.parseToken(token, remainTokens);
        }
        throw new Error(`tag ${token.getText()} not closed`);
      }

      *render(_ctx: Context): any {
        // noop
        return "";
      }
    }
  );

  // {% form 'form_type' %}
  // {% form 'form_type', param %}
  // {% form 'form_type', return_to: 'url %}
  liquidSwell.engine.registerTag(
    "form",
    class FormTag extends Tag {
      private formConfig: any;
      private hash: Hash;
      private templates: Template[] = [];

      constructor(
        token: TagToken,
        remainTokens: TopLevelToken[],
        liquid: Liquid
      ) {
        super(token, remainTokens, liquid);
        const { tokenizer } = token;
        const formType = (tokenizer.readValue() as QuotedToken)?.content;

        this.formConfig = liquidSwell.storefrontConfig?.forms?.find(
          (form: any) => form.id === formType
        );
        if (!this.formConfig) {
          throw new Error(`form '${formType}' not found`);
        }

        this.hash = new Hash(tokenizer.remaining());

        while (remainTokens.length) {
          const token = remainTokens.shift()!;
          if (TypeGuards.isTagToken(token) && token.name === "endform") return;
          this.templates.push(liquid.parser.parseToken(token, remainTokens));
        }

        throw new Error(`tag ${token.getText()} not closed`);
      }

      *render(ctx: Context): any {
        const r = this.liquid.renderer;
        const html = yield r.renderTemplates(this.templates, ctx);

        return `<form action="${this.formConfig.url}" method="post">${html}</form>`;
      }
    }
  );
}

/**
 * Utils used by liquidjs tags and filters
 */
class Drop {
  liquidMethodMissing(key: string) {
    return undefined;
  }
}

class ForloopDrop extends Drop {
  public i: number;
  public length: number;
  public name: string;

  constructor(length: number, collection: string, variable: string) {
    super();
    this.i = 0;
    this.length = length;
    this.name = `${variable}-${collection}`;
  }
  next() {
    this.i++;
  }
  index0() {
    return this.i;
  }
  index() {
    return this.i + 1;
  }
  first() {
    return this.i === 0;
  }
  last() {
    return this.i === this.length - 1;
  }
  rindex() {
    return this.length - this.i;
  }
  rindex0() {
    return this.length - this.i - 1;
  }
  valueOf() {
    return JSON.stringify(this);
  }
}

function toValue(value: any) {
  return value instanceof Drop && isFunction(value.valueOf)
    ? value.valueOf()
    : value;
}
function isString(value: any) {
  return typeof value === "string";
}
function isNumber(value: any) {
  return typeof value === "number";
}
function isFunction(value: any) {
  return typeof value === "function";
}
function toLiquid(value: any) {
  if (value && isFunction(value.toLiquid)) return toLiquid(value.toLiquid());
  return value;
}
function isNil(value: any) {
  return value == null;
}
function isUndefined(value: any) {
  return value === undefined;
}
function isArray(value: any) {
  // be compatible with IE 8
  return String(value) === "[object Array]";
}
function isObject(value: any) {
  const type = typeof value;
  return value !== null && (type === "object" || type === "function");
}
function isIterable(value: any) {
  return isObject(value) && Symbol.iterator in value;
}

function toEnumerable(val: any) {
  val = toValue(val);
  if (isArray(val)) return val;
  if (isString(val) && val.length > 0) return [val];
  if (isIterable(val)) return Array.from(val);
  if (isObject(val)) return Object.keys(val).map((key) => [key, val[key]]);
  return [];
}
