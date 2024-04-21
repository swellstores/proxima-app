export function shopifyFontToThemeFront(
  shopifyFontSetting: string,
): string | null {
  const parts = shopifyFontSetting.split('_');
  const familyId = parts.slice(0, -1).join('_');
  const variantId = parts[1];
  const shopifyFont = shopifyFontMap[familyId];

  if (shopifyFont) {
    const variant = shopifyFont?.variants[variantId];
    return `${shopifyFont.family}:${variant}`;
  }

  return null;
}

/**
 * Map of all available shopify fonts to their equivalent theme font.
 * https://shopify.dev/docs/themes/architecture/settings/fonts#available-fonts
 */
export const shopifyFontMap: {
  [key: string]: {
    family: string;
    variants: {
      [key: string]: string;
    };
  };
} = {
  assistant: {
    family: 'Assistant',
    variants: {
      n2: 'wght@200',
      n3: 'wght@300',
      n4: 'wght@400',
      n5: 'wght@500',
      n6: 'wght@600',
      n7: 'wght@700',
      n8: 'wght@800',
    },
  },
};
