import { LiquidSwell } from "..";

// {{ product.price | money }}

export default function bind(liquidSwell: LiquidSwell) {
  return (value: number) => {
    return liquidSwell.renderCurrency(value);
  };
}
