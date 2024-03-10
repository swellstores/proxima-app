import { LiquidSwell } from "../..";
import {
  Liquid,
  Tag,
  TagToken,
  Context,
  TopLevelToken,
  Hash,
  Scope,
} from "liquidjs";
import { QuotedToken } from "liquidjs/dist/tokens";

// {% include 'component' %}
// Deprecated in Shopify, supported for backward compatibility

export default function bind(liquidSwell: LiquidSwell) {
  return class IncludeTag extends Tag {
    private fileName: string;
    private hash: Hash;

    // Implementation adapted from liquidjs/src/tags/include.ts
    constructor(
      token: TagToken,
      remainTokens: TopLevelToken[],
      liquid: Liquid,
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
        liquidSwell.getComponentPath(this.fileName),
      );
      const output = yield liquidSwell.renderTemplate(
        themeConfig,
        scope as { [key: string]: any },
      );

      ctx.pop();

      return output;
    }
  };
}
