import { LiquidSwell } from "..";

// {{ 'asset.css' | asset_url | stylesheet_tag }}

export default function bind(_liquidSwell: LiquidSwell) {
  return (assetUrl: string) => {
    return `<link href="${assetUrl}" rel="stylesheet" type="text/css" media="all" />`;
  };
}
