import _ from "lodash";
import { LiquidSwell } from "..";

import asset_url from "./asset_url";
import stylesheet_tag from "./stylesheet_tag";
import t from "./t";

export const filters = {
  asset_url,
  stylesheet_tag,
  t,
};

export function bindFilters(liquidSwell: LiquidSwell) {
  _.each(filters, (bind, tag) =>
    liquidSwell.engine.registerFilter(tag, bind(liquidSwell)),
  );
}
