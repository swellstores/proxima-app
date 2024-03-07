import { LiquidSwell } from "..";

// {{ 'asset.css' | asset_url }}

export default function bind(liquidSwell: LiquidSwell) {
  return (assetPath: string) => {
    return liquidSwell.getAssetUrl(assetPath) || "";
  };
}
