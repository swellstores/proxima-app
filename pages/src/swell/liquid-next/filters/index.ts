import each from "lodash/each";
import { LiquidSwell } from "..";

import asset_url from "./asset_url";
import brightness_difference from "./brightness_difference";
import color_brightness from "./color_brightness";
import color_darken from "./color_darken";
import color_lighten from "./color_lighten";
import stylesheet_tag from "./stylesheet_tag";
import t from "./t";

export const filters = {
  asset_url,
  brightness_difference,
  color_brightness,
  color_darken,
  color_lighten,
  stylesheet_tag,
  t,
};

export function bindFilters(liquidSwell: LiquidSwell) {
  each(filters, (bind, tag) =>
    liquidSwell.engine.registerFilter(tag, bind(liquidSwell)),
  );
}
