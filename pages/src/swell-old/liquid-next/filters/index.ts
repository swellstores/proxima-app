import each from "lodash/each";
import { LiquidSwell } from "..";

import asset_url from "./asset_url";
import brightness_difference from "./brightness_difference";
import color_brightness from "./color_brightness";
import color_contrast from './color_contrast';
import color_darken from './color_darken';
import color_desaturate from './color_desaturate';
import color_difference from './color_difference';
import color_extract from './color_extract';
import color_lighten from './color_lighten';
import color_mix from './color_mix';
import color_modify from './color_modify';
import color_saturate from './color_saturate';
import color_to_hex from './color_to_hex';
import color_to_hsl from './color_to_hsl';
import color_to_rgb from './color_to_rgb';
import date from './date';
import font_face from './font_face';
import font_modify from './font_modify';
import font_url from './font_url';
import image_tag from './image_tag';
import image_url from './image_url';
import json from './json';
import money from './money';
import money_with_currency from './money_with_currency';
import money_without_currency from './money_without_currency';
import money_without_trailing_zeros from './money_without_trailing_zeros';
import stylesheet_tag from './stylesheet_tag';
import time_tag from './time_tag';
import translate from './translate';
import where from './where';

// Shopify compatibility only
import hex_to_rgba from './shopify/hex_to_rgba';
import placeholder_svg_tag from './shopify/placeholder_svg_tag';

export const filters = {
  asset_url,
  brightness_difference,
  color_brightness,
  color_contrast,
  color_darken,
  color_desaturate,
  color_difference,
  color_extract,
  color_lighten,
  color_mix,
  color_modify,
  color_saturate,
  color_to_hex,
  color_to_hsl,
  color_to_rgb,
  date,
  font_face,
  font_modify,
  font_url,
  image_tag,
  image_url,
  json,
  money,
  money_with_currency,
  money_without_currency,
  money_without_trailing_zeros,
  stylesheet_tag,
  time_tag,
  translate,
  t: translate, // alias
  where,

  // Shopify compatibility only
  hex_to_rgba,
  placeholder_svg_tag,
};

export function bindFilters(liquidSwell: LiquidSwell) {
  each(filters, (bind, tag) =>
    liquidSwell.engine.registerFilter(tag, bind(liquidSwell)),
  );
}
