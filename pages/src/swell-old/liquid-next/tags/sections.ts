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

    *render(_ctx: Context): any {
      const filePath = yield liquidSwell.getSectionGroupPath(this.fileName);
      const themeConfig = yield liquidSwell.getThemeConfig(filePath);

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
        return '';
      }
    }
  };
}
