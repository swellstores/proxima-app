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
import { QuotedToken } from "liquidjs/dist/tokens";

// {% form 'form_type' %}
// {% form 'form_type', param %}
// {% form 'form_type', return_to: 'url %}

export default function bind(liquidSwell: LiquidSwell) {
  return class FormTag extends Tag {
    private formConfig: any;
    private templates: Template[] = [];

    constructor(
      token: TagToken,
      remainTokens: TopLevelToken[],
      liquid: Liquid,
    ) {
      super(token, remainTokens, liquid);
      const { tokenizer } = token;
      const formType = (tokenizer.readValue() as QuotedToken)?.content;

      this.formConfig = liquidSwell.globals.storefrontConfig?.forms?.find(
        (form: any) => form.id === formType,
      );
      if (!this.formConfig) {
        throw new Error(
          `form '${formType}' not found in global 'storefrontConfig.forms'`,
        );
      }

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
  };
}
