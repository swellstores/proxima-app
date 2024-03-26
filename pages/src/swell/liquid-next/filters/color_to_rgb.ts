import { LiquidSwell, ThemeColor } from "..";

// Note this also supports Alpha channel, but Shopify does not
// {{ '#EA5AB9' | color_to_rgb }} => rgb(234, 90, 185)
// {{ '#EA5AB9' | color_to_rgb: 0.5 }} => rgba(234, 90, 185, 0.5)

export default function bind(_liquidSwell: LiquidSwell) {
  return (color: string | ThemeColor, alpha?: number): string => {
    return alpha !== undefined
      ? ThemeColor.get(color).rgba(alpha)
      : ThemeColor.get(color).rgb();
  };
}
