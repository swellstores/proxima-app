import { LiquidSwell, ThemeColor } from "..";

// {{ '#E800B0' | brightness_difference: '#FECEE9' }} => 134

export default function bind(_liquidSwell: LiquidSwell) {
  return (
    color1: string | ThemeColor,
    color2: string | ThemeColor,
  ): number => {
    return ThemeColor.get(color1).brightnessDifference(
      ThemeColor.get(color2),
    );
  };
}
