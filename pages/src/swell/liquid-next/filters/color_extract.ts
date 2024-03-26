import { LiquidSwell, ThemeColor } from "..";

// {{ '#EA5AB9' | color_extract: 'red' }} => 234

type ColorField = 'red' | 'green' | 'blue' | 'alpha' | 'hue' | 'saturation' | 'lightness';

export default function bind(_liquidSwell: LiquidSwell) {
  return (color: string | ThemeColor, field: ColorField): string => {
    return ThemeColor.get(color).extract(field);
  };
}
