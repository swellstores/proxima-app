import { LiquidSwell, ThemeColor } from "..";

// {{ '#EA5AB9' | color_brightness }} => 143.89

export default function bind(_liquidSwell: LiquidSwell) {
  return (color: string | ThemeColor): number => {
    return ThemeColor.get(color).brightness();
  };
}
