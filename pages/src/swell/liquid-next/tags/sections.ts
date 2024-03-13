import { LiquidSwell } from "..";
import { Liquid, Tag, TagToken, Context, TopLevelToken } from "liquidjs";
import { QuotedToken } from "liquidjs/dist/tokens";

// {% sections 'section-group' %}

export default function bind(liquidSwell: LiquidSwell) {
  return class SectionsTag extends Tag {
    private fileName: string;

    constructor(
      token: TagToken,
      remainTokens: TopLevelToken[],
      liquid: Liquid,
    ) {
      super(token, remainTokens, liquid);
      const { tokenizer } = token;
      this.fileName = (tokenizer.readValue() as QuotedToken)?.content;
    }

    *render(ctx: Context): any {
      const themeConfig = yield liquidSwell.getThemeConfig(
        liquidSwell.getSectionGroupPath(this.fileName),
      );

      // Restrict using in theme layouts only
      const themeFilePath = (ctx.environments as any).template.file_path;
      if (!themeFilePath?.startsWith("theme/layouts")) {
        throw new Error(
          `The {% section %} tag can only be used in theme layout files.`,
        );
      }

      try {
        const sectionGroup = JSON.parse(themeConfig.file_data);
        const output = yield liquidSwell.renderTemplateSections(sectionGroup);
        const sc = liquidSwell.globals.shopify_compat;
        return sc
          ? `
          <div class="swell-section-group swell-section-group--${this.fileName} shopify-section shopify-section-group-${this.fileName}" id="shopify-sections--${themeConfig.hash}__${this.fileName}">
            ${output}
          </div>`
          : `
          <div class="swell-section-group" swell-section-group--${this.fileName}" id="swell-section-group--${themeConfig.hash}__${this.fileName}">
            ${output}
          </div>`;
      } catch (err) {
        return "";
      }
    }
  };
}
