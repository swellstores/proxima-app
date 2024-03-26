import { LiquidSwell } from "..";
import {
  Liquid,
  Tag,
  TagToken,
  Context,
  TopLevelToken,
  Template,
  Value,
  ValueToken,
  ParseStream,
  evalToken,
  toValue,
} from 'liquidjs';

/*
{% case variable %}
  {% when first_value %}
    first_expression
  {% when second_value %}
    second_expression
  {% else %}
    third_expression
{% endcase %}
*/

// Note: Re-implemented to support wrapping blocks in container elements for theme editor functionality

export default function bind(liquidSwell: LiquidSwell) {
  return class CaseTag extends Tag {
    value: Value
    branches: { values: ValueToken[], templates: Template[] }[] = []
    elseTemplates: Template[] = []
    isBlock: boolean = false

    constructor (tagToken: TagToken, remainTokens: TopLevelToken[], liquid: Liquid) {
      super(tagToken, remainTokens, liquid)

      // Determine if the variable is a block
      const begin = this.tokenizer.p;
      const caseVar = (this.tokenizer.readValue() as ValueToken)?.getText();
      this.isBlock = Boolean(caseVar?.startsWith('block.'));
      this.tokenizer.p = begin;

      this.value = new Value(this.tokenizer.readFilteredValue(), this.liquid)
      this.elseTemplates = []

      let p: Template[] = []
      let elseCount = 0
      const stream: ParseStream = this.liquid.parser.parseStream(remainTokens)
        .on('tag:when', (token: TagToken) => {
          if (elseCount > 0) {
            return
          }

          p = []

          const values: ValueToken[] = []
          while (!token.tokenizer.end()) {
            values.push(token.tokenizer.readValueOrThrow())
            token.tokenizer.skipBlank()
            if (token.tokenizer.peek() === ',') {
              token.tokenizer.readTo(',')
            } else {
              token.tokenizer.readTo('or')
            }
          }
          this.branches.push({
            values,
            templates: p
          })
        })
        .on('tag:else', () => {
          elseCount++
          p = this.elseTemplates
        })
        .on('tag:endcase', () => stream.stop())
        .on('template', (tpl: Template) => {
          if (p !== this.elseTemplates || elseCount === 1) {
            p.push(tpl)
          }
        })
        .on('end', () => {
          throw new Error(`tag ${tagToken.getText()} not closed`)
        })

      stream.start()
    }

    * render (ctx: Context): Generator<any> {
      const r = this.liquid.renderer
      const target = toValue(yield this.value.value(ctx, ctx.opts.lenientIf))
      let branchHit = false

      let output = '';
      for (const branch of this.branches) {
        for (const valueToken of branch.values) {
          const value = yield evalToken(valueToken, ctx, ctx.opts.lenientIf)
          if (target === value) {
            const blockOutput = yield r.renderTemplates(branch.templates, ctx)
            output += this.isBlock && liquidSwell.isEditor
              ? `<span class="swell-block">${blockOutput}</span>`
              : blockOutput
            branchHit = true
            break
          }
        }
      }
      if (!branchHit) {
        output += yield r.renderTemplates(this.elseTemplates, ctx)
      }

      return output
    }
  };
}
