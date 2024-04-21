import { LiquidSwell, ThemeColor } from "..";

// {{ '#720955' | color_difference: '#FFF3F9' }} => 539

export default function bind(_liquidSwell: LiquidSwell) {
  return (
    color1: string | ThemeColor,
    color2: string | ThemeColor,
  ): number => {
    return ThemeColor.get(color1).difference(
      ThemeColor.get(color2),
    );
  };
}
