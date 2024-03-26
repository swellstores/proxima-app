import { fontMap } from './font-map';

export class ThemeFont {
  public id: string = '';
  public family: string = 'sans-serif';
  public weight: number = 400;
  public style: string = 'normal';
  public fallback_families?: string = 'sans-serif'; // TODO

  public system: boolean = true;
  public variant: ThemeFontVariant = { wght: 400 };

  public variants: ThemeFont[] = [];

  public definition?: ThemeFontConfig;

  constructor(fontSetting: ThemeFontVariantSetting | string) {
    let family, style, weight, variant;

    if (typeof fontSetting === 'string') {
      ({ family, style, weight, variant } =
        ThemeFont.stringToSetting(fontSetting));
    } else if (fontSetting) {
      ({ family, style, weight, variant } =
        ThemeFont.resolveSetting(fontSetting));
    }

    if (family) {
      this.id =
        typeof fontSetting === 'string'
          ? fontSetting
          : ThemeFont.settingToString({ family, weight, style, variant });
      this.family = family;
      this.style = style || 'normal';

      if (weight) {
        this.weight = weight;
      }
      if (variant) {
        this.variant = variant;
      }

      this.definition = ThemeFont.findByFamily(family);

      if (this.definition) {
        this.fallback_families = this.definition.fallback;
        this.system = this.definition.system || false;
        /* this.variants = this.definition.variants.map(
          (variant: ThemeFontVariant) => {
            return new ThemeFont({
              family,
              weight,
              variant,
            });
          },
        ); */
      }
    }
  }

  static get(fontSetting: string | ThemeFont): ThemeFont {
    return fontSetting instanceof ThemeFont
      ? fontSetting
      : new ThemeFont(fontSetting);
  }

  static findByFamily(family: string) {
    return fontMap.find((f) => f.family.toLowerCase() === family.toLowerCase());
  }

  static stringToSetting(fontSetting: string) {
    const [family, variant] = fontSetting.split(':');
    const [axisId, valueId] = variant?.toLowerCase().split('@') || [];

    const axes = axisId.split(',');
    const values = valueId.split(',');
    const weight = parseInt(values[axes.indexOf('wght')], 10);

    return {
      family,
      weight,
      style: axes.includes('ital')
        ? 'italic'
        : axes.includes('slnt')
          ? 'oblique'
          : 'normal',
      variant: {
        wght: weight,
        wdth: axes.includes('wdth')
          ? parseInt(values[axes.indexOf('wdth')], 10)
          : undefined,
        slnt: axes.includes('slnt')
          ? parseInt(values[axes.indexOf('slnt')], 10)
          : undefined,
        opsz: axes.includes('opsz')
          ? parseInt(values[axes.indexOf('opsz')], 10)
          : undefined,
        ital: axes.includes('ital')
          ? parseInt(values[axes.indexOf('ital')], 10)
          : undefined,
      },
    };
  }

  static settingToString(setting: ThemeFontVariantSetting) {
    const { family, variant } = ThemeFont.resolveSetting(setting);
    return `${family}:${ThemeFont.variantToString(variant)}`;
  }

  static variantToString(variant: ThemeFontVariant) {
    const axes = [
      'wght',
      ...(variant.wdth !== undefined ? ['wdth'] : []),
      ...(variant.slnt !== undefined ? ['slnt'] : []),
      ...(variant.opsz !== undefined ? ['opsz'] : []),
      ...(variant.ital !== undefined ? ['ital'] : []),
    ];

    const values = [
      variant.wght,
      ...(variant.wdth !== undefined ? [variant.wdth] : []),
      ...(variant.slnt !== undefined ? [variant.slnt] : []),
      ...(variant.opsz !== undefined ? [variant.opsz] : []),
      ...(variant.ital !== undefined ? [variant.ital] : []),
    ];

    const axisId = axes.join(',');
    const valueId = values.join(',');
    return `${axisId}@${valueId}`;
  }

  static resolveSetting(setting: ThemeFontVariantSetting) {
    const { family, style, weight, variant } = setting;

    const font = ThemeFont.findByFamily(family);

    const wdthValue =
      typeof variant?.wdth === 'number' ? variant.wdth : undefined;

    const italValue =
      typeof variant?.ital === 'number'
        ? variant.ital
        : style === 'italic'
          ? font?.variants.find((v) => v.ital && v.ital > 0)?.ital
          : undefined;

    const opszValue =
      typeof variant?.opsz === 'number' ? variant.opsz : undefined;

    const slntValue =
      typeof variant?.slnt === 'number'
        ? variant.slnt
        : style === 'oblique'
          ? font?.variants.find((v) => v.slnt && v.slnt > 0)?.slnt
          : undefined;

    return {
      family,
      weight: weight || variant?.wght,
      style:
        italValue !== undefined
          ? 'italic'
          : slntValue !== undefined
            ? 'oblique'
            : 'normal',
      variant: {
        wght: weight || variant?.wght,
        wdth: wdthValue,
        slnt: slntValue,
        opsz: opszValue,
        ital: italValue,
      },
    };
  }

  static combinedGoogleFontUrl(fontSettings: any[]) {
    const allFonts = fontSettings.map((font) => ThemeFont.get(font));

    const allFamilies: string[] = [];
    for (const font of allFonts) {
      const googleFamily = font.googleFamily();
      if (!allFamilies.includes(googleFamily)) {
        allFamilies.push(googleFamily);
      }
    }

    return `https://fonts.googleapis.com/css2?family=${allFamilies.join(
      '&family=',
    )}&display=swap`;
  }

  toString() {
    return this.id;
  }

  googleFamily() {
    if (this.definition) {
      const allAxes = this.definition.axes;
      const allValues = this.definition.variants.map(
        (variant: ThemeFontVariant) =>
          allAxes.map((axis) => variant[axis]).join(','),
      );
      return `${this.family}:${allAxes.join(',')}@${allValues.join(';')}`;
    }

    return '';
  }

  url() {
    return `https://fonts.googleapis.com/css2?family=${this.googleFamily()}&display=swap`;
  }

  face(options: { font_display?: string } = {}) {
    const css = `
    @font-face {
      font-family: '${this.family}';
      font-style: ${this.style};
      font-weight: ${this.weight};${options.font_display ? `\n      font-display: ${options.font_display};` : ''}
    }
  `;
    // trim whitespace
    return css.replace(/^    */gm, '').trim();
  }

  modify(prop: string, value: string): ThemeFont | null {
    // Returns null if modified property is invalid
    switch (prop) {
      case 'style':
        const validStyle = this.resolveValidProperty(prop, value);
        if (validStyle) {
          this.style = value;
          if (value === 'oblique') {
            this.variant.slnt = 1;
          } else if (value === 'italic') {
            this.variant.ital = 1;
          } else {
            this.variant.slnt = 0;
            this.variant.ital = 0;
          }
          break;
        }
        return null;

      // Modify weight by relative or absolute value
      case 'weight':
        let targetWeight;
        switch (value) {
          case 'normal':
            targetWeight = 400;
            break;
          case 'bold':
            targetWeight = 700;
            break;
          case 'lighter':
            if (this.weight <= 400) {
              targetWeight = 100;
            } else if (this.weight <= 700) {
              targetWeight = 400;
            } else {
              targetWeight = 700;
            }
            break;
          case 'bolder':
            if (this.weight < 400) {
              targetWeight = 400;
            } else if (this.weight < 700) {
              targetWeight = 700;
            } else {
              targetWeight = 900;
            }
            break;
          default:
            if (value[0] === '+') {
              targetWeight = this.weight + parseInt(value.slice(1), 10);
            } else if (value[0] === '-') {
              targetWeight = this.weight - parseInt(value.slice(1), 10);
            } else {
              targetWeight = parseInt(value, 10);
            }
            const validWeight = this.resolveValidProperty(
              prop,
              targetWeight,
            ) as number;
            if (validWeight) {
              this.weight = targetWeight;
              this.variant.wght = validWeight;
              break;
            }
            return null;
        }
        break;

      // Modify variant properties
      case 'wght':
      case 'wdth':
      case 'slnt':
      case 'opsz':
      case 'ital':
        const validValue = this.resolveValidProperty(prop, value) as number;
        if (validValue) {
          this.variant[prop] = validValue;
          if (prop === 'slnt' && validValue > 0) {
            this.style = 'oblique';
          } else if (prop === 'ital' && validValue > 0) {
            this.style = 'italic';
          } else if (prop === 'slnt' || prop === 'ital') {
            this.style = 'normal';
          }
          break;
        }
        return null;

      default:
        throw new Error(`Invalid font property: ${prop}`);
    }

    return this;
  }

  resolveValidProperty(prop: string, value: string | number) {
    if (!this.definition) {
      return null;
    }
    if (prop === 'style') {
      switch (value) {
        case 'italic':
          return this.definition.axes.includes('ital') ? 'italic' : null;
        case 'oblique':
          return this.definition.axes.includes('slnt') ? 'oblique' : null;
        default:
          return null;
      }
    }

    const targetValue = typeof value === 'string' ? parseInt(value, 10) : value;
    switch (prop) {
      case 'wght':
      case 'weight':
        return (
          this.definition.variants.find((v) => v.wght === targetValue) || null
        );
      case 'wdth':
        return (
          this.definition.variants.find((v) => v.wdth === targetValue) || null
        );
      case 'slnt':
        return (
          this.definition.variants.find((v) => v.slnt === targetValue) || null
        );
      case 'opsz':
        return (
          this.definition.variants.find((v) => v.opsz === targetValue) || null
        );
      case 'ital':
        return (
          this.definition.variants.find((v) => v.ital === targetValue) || null
        );
      default:
        return null;
    }
  }
}
