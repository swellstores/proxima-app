import { LiquidSwell } from "../..";
import placeholderSvgs from "./placeholder-svgs";

// {{ 'image' | placeholder_svg_tag }}

export default function bind(_liquidSwell: LiquidSwell) {
  return (name: string): string => {
    const svg =
      placeholderSvgs[name as keyof typeof placeholderSvgs];

    return svg
      ? `<img src="${svg.src}" alt="${name}"` +
          ` class="placeholder-svg placeholder-svg--${name}" />`
      : "";
  };
}
