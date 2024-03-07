import { LiquidSwell, ThemeColor } from "..";

// {{ '#EA5AB9' | color_brightness }} => 143.89

export default function bind(_liquidSwell: LiquidSwell) {
  return (color: string | ThemeColor, percent: number): ThemeColor => {
    return ThemeColor.get(color).darken(percent);
  };
}
