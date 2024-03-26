import { LiquidSwell, ThemeColor } from "..";

// {{ '#EA5AB9' | color_to_hsl }} => hsl(320, 77%, 64%)

export default function bind(_liquidSwell: LiquidSwell) {
  return (color: string | ThemeColor): string => {
    return ThemeColor.get(color).hsl();
  };
}
