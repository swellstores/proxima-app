import _ from "lodash";
import { LiquidSwell } from "..";

// import { default as forTag } from "./for";
import form from "./form";
import include from "./include";
import javascript from "./javascript";
import layout from "./layout";
import render from "./render";
import schema from "./schema";
import section from "./section";
import sections from "./sections";
import style from "./style";

export const tags = {
  // for: forTag,
  form,
  include,
  javascript,
  layout,
  render,
  schema,
  section,
  sections,
  style,
};

export function bindTags(liquidSwell: LiquidSwell) {
  _.each(tags, (bind, tag) =>
    liquidSwell.engine.registerTag(tag, bind(liquidSwell)),
  );
}
