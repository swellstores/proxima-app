import { LiquidSwell, ThemeColor } from "..";

// {{ '#E800B0' | color_mix: '#00936F', 50 }} => #744a90
// {{ 'rgba(232, 0, 176, 0.75)' | color_mix: '#00936F', 50 }} => rgba(116, 74, 144, 0.88)

export default function bind(_liquidSwell: LiquidSwell) {
  return (color1: string | ThemeColor, color2: string | ThemeColor, ratio: number): string => {
    return ThemeColor.get(color1).mix(ThemeColor.get(color2), ratio);
  };
}
