import { LiquidSwell } from "..";
import { Liquid, Tag, TagToken, Context, TopLevelToken } from "liquidjs";
import { QuotedToken } from "liquidjs/dist/tokens";

// {% section 'name' %}

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

    *render(_ctx: Context): any {
      const themeConfig = yield liquidSwell.getThemeConfig(
        liquidSwell.getSectionGroupPath(this.fileName),
      );
      try {
        const sectionGroup = JSON.parse(themeConfig.file_data);
        const output = yield liquidSwell.renderTemplateSections(sectionGroup);
        const sc = liquidSwell.globals.shopify_compat;
        return sc
          ? `
          <div id="shopify-sections--${themeConfig.hash}__this.fileName" class="shopify-section shopify-section-group-${this.fileName}">
            ${output}
          </div>
        `
          : output;
      } catch (err) {
        return "";
      }
    }
  };
}
