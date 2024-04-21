import { LiquidSwell } from '..';
import {
  Liquid,
  Tag,
  TagToken,
  Context,
  TopLevelToken,
  Template,
  ValueToken,
  Hash,
  ParseStream,
  Emitter,
  evalToken,
} from 'liquidjs';

/*
  {% paginate array by page_size %}
    {% for item in array %}
      forloop_content
    {% endfor %}
  {% endpaginate %}
*/

export default function bind(_liquidSwell: LiquidSwell) {
  return class PaginateTag extends Tag {
    private collection: ValueToken;
    private pageSize: ValueToken | undefined;
    private templates: Template[] = [];
    private hash: Hash;

    constructor(
      token: TagToken,
      remainTokens: TopLevelToken[],
      liquid: Liquid,
    ) {
      super(token, remainTokens, liquid);

      const collection = this.tokenizer.readValue();
      const byStr = this.tokenizer.readIdentifier();
      this.pageSize = this.tokenizer.readValue();
      if (byStr.content !== 'by' || !collection) {
        throw new Error(`illegal tag: ${token.getText()}`);
      }

      this.collection = collection;
      this.hash = new Hash(this.tokenizer.remaining());

      let p;
      const stream: ParseStream = this.liquid.parser
        .parseStream(remainTokens)
        .on('start', () => (p = this.templates))
        .on('tag:endpaginate', () => stream.stop())
        .on('template', (tpl: Template) => p.push(tpl))
        .on('end', () => {
          throw new Error(`tag ${token.getText()} not closed`);
        });

      stream.start();
    }

    *render(ctx: Context, emitter: Emitter): any {
      const r = this.liquid.renderer;

      let collection = yield evalToken(this.collection, ctx);
      let pageSize = Number(yield evalToken(this.pageSize, ctx));
      const hash = yield this.hash.render(ctx);

      if (isNaN(pageSize)) {
        return;
      }

      if (
        (!collection?._result && collection?._get) ||
        (collection?._get && collection._query?.limit !== pageSize)
      ) {
        yield collection._get({
          limit: pageSize,
          window: hash.window_size || undefined,
        });
      }

      yield r.renderTemplates(this.templates, ctx, emitter);
    }
  };
}
