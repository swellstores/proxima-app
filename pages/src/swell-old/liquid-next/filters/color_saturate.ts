import { LiquidSwell, ThemeColor } from "..";

// {{ '#EA5AB9' | color_saturate: 30 }} => #ff45c0

export default function bind(_liquidSwell: LiquidSwell) {
  return (color: string | ThemeColor, value: number): string => {
    return ThemeColor.get(color).saturate(value);
  };
}
