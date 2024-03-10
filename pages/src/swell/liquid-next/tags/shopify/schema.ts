import { LiquidSwell } from "../..";
import {
  Liquid,
  Tag,
  TagToken,
  Context,
  TopLevelToken,
  TypeGuards,
} from "liquidjs";

// {% schema %}

export default function bind(_liquidSwell: LiquidSwell) {
  return class SchemaTag extends Tag {
    constructor(
      token: TagToken,
      remainTokens: TopLevelToken[],
      liquid: Liquid,
    ) {
      super(token, remainTokens, liquid);
      while (remainTokens.length) {
        const token = remainTokens.shift()!;
        if (TypeGuards.isTagToken(token) && token.name === "endschema") return;
        // noop
        liquid.parser.parseToken(token, remainTokens);
      }
      throw new Error(`tag ${token.getText()} not closed`);
    }

    *render(_ctx: Context): any {
      // noop
      return "";
    }
  };
}
