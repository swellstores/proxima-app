import { LiquidSwell } from "..";
import {
  Liquid,
  Tag,
  TagToken,
  Context,
  TopLevelToken,
  Template,
  TypeGuards,
} from "liquidjs";

// {% style %} div: { color: {{ settings.color }}; } {% endstyle %}

export default function bind(_liquidSwell: LiquidSwell) {
  return class StyleTag extends Tag {
    private templates: Template[] = [];

    constructor(
      token: TagToken,
      remainTokens: TopLevelToken[],
      liquid: Liquid,
    ) {
      super(token, remainTokens, liquid);

      while (remainTokens.length) {
        const token = remainTokens.shift()!;
        if (TypeGuards.isTagToken(token) && token.name === "endstyle") return;
        this.templates.push(liquid.parser.parseToken(token, remainTokens));
      }

      throw new Error(`tag ${token.getText()} not closed`);
    }

    *render(ctx: Context): any {
      const r = this.liquid.renderer;
      const css = yield r.renderTemplates(this.templates, ctx);

      // This is used to update CSS in real-time from the theme editor without a page refresh
      return `<style data-swell>${css}</style>`;
    }
  };
}
