/**
 * Map of all fonts supported by Swell.
 */
export const fontMap: Array<{
  family: string;
  fallback?: string;
  axes: Array<'wght' | 'wdth' | 'slnt' | 'opsz' | 'ital'>;
  variants: Array<{
    wght: number;
    wdth?: number;
    slnt?: number;
    opsz?: number;
    ital?: number;
  }>;
  system?: boolean;
}> = [
  // System fonts
  {
    family: 'monospace',
    axes: ['wght', 'ital'],
    variants: [{ wght: 400 }, { wght: 400, ital: 1 }, { wght: 600, ital: 1 }],
    system: true,
  },
  {
    family: 'serif',
    axes: ['wght', 'ital'],
    variants: [{ wght: 400 }, { wght: 400, ital: 1 }, { wght: 600, ital: 1 }],
    system: true,
  },
  {
    family: 'sans-serif',
    axes: ['wght', 'ital'],
    variants: [{ wght: 400 }, { wght: 400, ital: 1 }, { wght: 600, ital: 1 }],
    system: true,
  },
  // Google fonts
  {
    family: 'Assistant',
    fallback: 'serif',
    axes: ['wght'],
    variants: [
      { wght: 200 },
      { wght: 300 },
      { wght: 400 },
      { wght: 500 },
      { wght: 600 },
      { wght: 700 },
      { wght: 800 },
    ],
  },
  {
    family: 'Akko',
    axes: ['wght', 'ital'],
    variants: [
      { wght: 200 },
      { wght: 200, ital: 1 },
      { wght: 300 },
      { wght: 300, ital: 1 },
      { wght: 400 },
      { wght: 400, ital: 1 },
      { wght: 500 },
      { wght: 500, ital: 1 },
      { wght: 700 },
      { wght: 700, ital: 1 },
      { wght: 900 },
      { wght: 900, ital: 1 },
    ],
  },
];
/*{
  abel: {
    family: 'Abel',
    styles: {
      n4: '400',
    },
  },
  abril_fatface: {
    family: 'Abril+Fatface',
    styles: {
      n4: '400',
    },
  },
  agmena: {
    family: 'Agmena',
    styles: {
      n3: '300',
      i3: '300;1',
      n4: '400',
      i4: '400;1',
      n6: '600',
      i6: '600;1',
      n7: '700',
      i7: '700;1',
    },
  },
  akko: {
    family: 'Akko',
    styles: {
      n2: '200',
      i2: '200;1',
      n3: '300',
      i3: '300;1',
      n4: '400',
      i4: '400;1',
      n5: '500',
      i5: '500;1',
      n7: '700',
      i7: '700;1',
      n9: '900',
      i9: '900;1',
    },
  },
  alegreya: {
    family: 'Alegreya',
    italic: true,
    styles: {
      n4: '400',
      i4: '400;1',
      n5: '500',
      i5: '500;1',
      n7: '700',
      i7: '700;1',
      n8: '800',
      i8: '800;1',
      n9: '900',
      i9: '900;1',
    },
  },
  alegreya_sans: {
    family: 'Alegreya+Sans',
    italic: true,
    styles: {
      n1: '100',
      i1: '100;1',
      n3: '300',
      i3: '300;1',
      n4: '400',
      i4: '400;1',
      n5: '500',
      i5: '500;1',
      n7: '700',
      i7: '700;1',
      n8: '800',
      i8: '800;1',
      n9: '900',
      i9: '900;1',
    },
  },
  assistant: {
    family: 'Assistant',
    styles: {
      n2: '200',
      n3: '300',
      n4: '400',
      n5: '500',
      n6: '600',
      n7: '700',
      n8: '800',
    },
  },
  avenir_next: {
    family: 'Avenir+Next',
    styles: {
      n2: '200',
      n3: '300',
      n4: '400',
      n5: '500',
      n6: '600',
      n7: '700',
      n8: '800',
    },
  },
};*/

export const systemFonts = fontMap
  .filter((font) => font.system)
  .map((font) => font.family);
