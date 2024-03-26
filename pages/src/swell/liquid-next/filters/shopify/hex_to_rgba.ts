import { LiquidSwell, ThemeColor } from "../..";

// Deprecated in Shopify, supported for backward compatibility
// Replaced by color_to_rgb

// {{ '#EA5AB9' | hex_to_rgba: 0.5 }} => rgba(234,90,185,0.5)

export default function bind(_liquidSwell: LiquidSwell) {
  return (color: string | ThemeColor, alpha?: number): string => {
    return ThemeColor.get(color).rgba(alpha || 1);
  };
}
