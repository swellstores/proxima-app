import each from "lodash/each";
import { LiquidSwell } from "..";

import asset_url from "./asset_url";
import brightness_difference from "./brightness_difference";
import color_brightness from "./color_brightness";
import color_darken from "./color_darken";
import color_lighten from "./color_lighten";
import inspect from "./inspect";
import money from "./money";
import money_with_currency from "./money_with_currency";
import money_without_currency from "./money_without_currency";
import money_without_trailing_zeros from "./money_without_trailing_zeros";
import stylesheet_tag from "./stylesheet_tag";
import t from "./t";

// Shopify compatibility only
import placeholder_svg_tag from "./shopify/placeholder_svg_tag";

export const filters = {
  asset_url,
  brightness_difference,
  color_brightness,
  color_darken,
  color_lighten,
  inspect,
  money,
  money_with_currency,
  money_without_currency,
  money_without_trailing_zeros,
  stylesheet_tag,
  t,

  // Shopify compatibility only
  placeholder_svg_tag,
};

export function bindFilters(liquidSwell: LiquidSwell) {
  each(filters, (bind, tag) =>
    liquidSwell.engine.registerFilter(tag, bind(liquidSwell)),
  );
}
