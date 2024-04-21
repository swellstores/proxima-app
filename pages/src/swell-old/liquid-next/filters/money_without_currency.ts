import { LiquidSwell } from "..";

// {{ product.price | money_without_currency }}

export default function bind(liquidSwell: LiquidSwell) {
  return (value: number) => {
    return liquidSwell.renderCurrency(value).replace(/[^0-9.,]/g, "");
  };
}
