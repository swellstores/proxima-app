import { LiquidSwell, ThemeColor } from "..";

// {{ '#EA5AB9' | color_desaturate: 30 }} => #ce76b0

export default function bind(_liquidSwell: LiquidSwell) {
  return (color: string | ThemeColor, value: number): string => {
    return ThemeColor.get(color).desaturate(value);
  };
}
