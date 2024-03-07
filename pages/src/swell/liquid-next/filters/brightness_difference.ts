import { LiquidSwell, ThemeColor } from "..";

// {{ '#E800B0' | brightness_difference: '#FECEE9' }} => 134

export default function bind(_liquidSwell: LiquidSwell) {
  return (
    colorVal1: string | ThemeColor,
    colorVal2: string | ThemeColor,
  ): number => {
    return ThemeColor.get(colorVal1).brightnessDifference(
      ThemeColor.get(colorVal2),
    );
  };
}
