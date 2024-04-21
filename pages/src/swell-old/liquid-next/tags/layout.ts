import { LiquidSwell } from "..";
import { Liquid, Tag, TagToken, Context, TopLevelToken } from "liquidjs";
import { QuotedToken } from "liquidjs/dist/tokens";

// {% layout 'name' %}
// {% layout none %}

export default function bind(liquidSwell: LiquidSwell) {
  return class LayoutTag extends Tag {
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
      // Layout is actually rendered separately
      liquidSwell.layoutName = this.fileName;
      return "";
    }
  };
}
