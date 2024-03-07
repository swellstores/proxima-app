import { LiquidSwell } from "..";
import { Liquid, Tag, TagToken, Context, TopLevelToken } from "liquidjs";
import { QuotedToken } from "liquidjs/dist/tokens";

// {% section 'name' %}

export default function bind(liquidSwell: LiquidSwell) {
  return class SectionTag extends Tag {
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
        liquidSwell.getSectionPath(this.fileName),
      );
      return yield liquidSwell.renderTemplate(themeConfig);
    }
  };
}
