import each from "lodash/each";
import { LiquidSwell } from "..";

import { default as caseTag } from "./case";
import { default as forTag } from "./for";
import form from "./form";
import javascript from "./javascript";
import layout from "./layout";
import paginate from "./paginate";
import render from "./render";
import section from "./section";
import sections from "./sections";
import style from "./style";

// Shopify compatibility only
import include from "./shopify/include";
import schema from "./shopify/schema";

export const tags = {
  case: caseTag,
  for: forTag,
  form,
  javascript,
  layout,
  paginate,
  render,
  section,
  sections,
  style,

  // Shopify compatibility only
  include,
  schema,
};

export function bindTags(liquidSwell: LiquidSwell) {
  each(tags, (bind, tag) =>
    liquidSwell.engine.registerTag(tag, bind(liquidSwell)),
  );
}
