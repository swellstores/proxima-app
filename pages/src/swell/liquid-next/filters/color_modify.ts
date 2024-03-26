import { LiquidSwell, ThemeColor } from "..";

// {{ '#EA5AB9' | color_modify: 'red', 255 }} => #ff5ab9
// {{ '#EA5AB9' | color_modify: 'alpha', 0.85 }} => rgba(234, 90, 185, 0.85)

type ColorField = 'red' | 'green' | 'blue' | 'alpha' | 'hue' | 'saturation' | 'lightness';

export default function bind(_liquidSwell: LiquidSwell) {
  return (color: string | ThemeColor, field: ColorField, value: number): string => {
    return ThemeColor.get(color).modify(field, value);
  };
}
