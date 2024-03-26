import { ShopifyResource } from './resource';

export default function ShopifyFont(
  _instance: ShopifyCompatibility,
  font: ThemeFont,
): ShopifyResource {
  if (font instanceof ShopifyResource) {
    return font.clone();
  }
  return new ShopifyResource({
    baseline_ratio: null, // TODO
    fallback_families: font.fallback_families,
    family: font.family,
    style: font.style,
    system: font.system,
    variants: font.variants.map((variant) => ShopifyFont(_instance, variant)),
    weight: font.weight,
  });
}
