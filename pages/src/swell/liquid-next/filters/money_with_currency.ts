import { LiquidSwell } from "..";

// {{ product.price | money_with_currency }}

export default function bind(liquidSwell: LiquidSwell) {
  return (value: number) => {
    return `${liquidSwell.renderCurrency(value)} ${liquidSwell.currency?.toUpperCase()}`;
  };
}
