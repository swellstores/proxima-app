import { LiquidSwell } from "..";

// {{ product.price | money_without_trailing_zeros }}

export default function bind(liquidSwell: LiquidSwell) {
  return (value: number) => {
    return liquidSwell.renderCurrency(value).split(".")[0].split(",")[0];
  };
}
