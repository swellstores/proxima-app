import { LiquidSwell, ThemeColor } from "..";

// {{ 'rgb(234, 90, 185)' | color_to_hex }} => #ea5ab9

export default function bind(_liquidSwell: LiquidSwell) {
  return (color: string | ThemeColor): string => {
    return ThemeColor.get(color).hex();
  };
}
