import { LiquidSwell, ThemeColor } from "..";

// {{ '#EA5AB9' | color_darken: 30 }} => #98136b

export default function bind(_liquidSwell: LiquidSwell) {
  return (color: string | ThemeColor, percent: number): string => {
    return ThemeColor.get(color).darken(percent);
  };
}
