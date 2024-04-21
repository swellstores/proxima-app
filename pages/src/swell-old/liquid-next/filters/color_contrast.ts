import { LiquidSwell, ThemeColor } from "..";

// {{ '#E800B0' | color_contrast: '#D9D8FF' }} => 3.0

export default function bind(_liquidSwell: LiquidSwell) {
  return (color1: string | ThemeColor, color2: string | ThemeColor): string => {
    return ThemeColor.get(color1).contrast(
      ThemeColor.get(color2),
    );
  };
}
