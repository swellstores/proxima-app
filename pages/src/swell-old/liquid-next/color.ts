import Color from "color";

export type ColorParam =
  | Color
  | string
  | ArrayLike<number>
  | number
  | { [key: string]: any };

export class ThemeColor {
  public color: Color;
  public colorValues: ColorParam;
  public red: number;
  public green: number;
  public blue: number;

  constructor(value: string) {
    try {
      this.color = Color(value);
      this.colorValues = this.color.object();
      this.red = this.colorValues.r;
      this.green = this.colorValues.g;
      this.blue = this.colorValues.b;
    } catch (err) {
      // Just default to black in case of parse error
      this.color = Color("#000000");
      this.colorValues = this.color.object();
      this.red = this.colorValues.r;
      this.green = this.colorValues.g;
      this.blue = this.colorValues.b;
    }
  }

  static get(colorVal: string | ThemeColor): ThemeColor {
    return colorVal instanceof ThemeColor ? colorVal : new ThemeColor(colorVal);
  }

  toString() {
    return this.color.string();
  }

  lighten(percent: number) {
    return this.color.lighten(percent / 100).hex().toLowerCase();
  }

  darken(percent: number) {
    return this.color.darken(percent / 100).hex().toLowerCase();
  }

  rgb() {
    return this.color.rgb().toString();
  }

  rgba(alpha: number) {
    return this.color.alpha(alpha).rgb().toString();
  }

  hsl() {
    return this.color.hsl().round().toString();
  }

  hex() {
    return this.color.hex().toLowerCase();
  }

  saturate(value: number) {
    return this.color.saturate(value / 100).hex().toLowerCase();
  }

  desaturate(value: number) {
    return this.color.desaturate(value / 100).hex().toLowerCase();
  }

  modify(field: string, value: number){
    if (!['red', 'green', 'blue', 'alpha', 'hue', 'lightness', 'saturation'].includes(field)) return this.toString();
    if (field === 'saturation') {
      return this.color.saturationl(value);
    }
    return (this.color as any)[field](value).string();
  }

  extract(field: string) {
    if (!['red', 'green', 'blue', 'alpha', 'hue', 'lightness', 'saturation'].includes(field)) return this.toString();
    if (field === 'saturation') {
      return this.color.saturationl();
    }
    return (this.color as any)[field]().string();
  }

  mix(color2: ThemeColor, ratio: number) {
    const c1 = this.color;
    const c2 = color2.color;
    const [r1, g1, b1] = c1.rgb().array()
    const [r2, g2, b2] = c2.rgb().array()
    return Color
      .rgb([mix(r1, r2, ratio), mix(g1, g2, ratio), mix(b1, b2, ratio)])
      .alpha(mix(c1.alpha(), c2.alpha(), ratio))
      .string()
  }

  contrast(color2: ThemeColor) {
    return this.color.contrast(color2.color).toFixed(1);
  }



  /**
   * Color perceived brightness/difference algorithms from https://www.w3.org/WAI/ER/WD-AERT/#color-contrast
   */

  difference(color2: ThemeColor): number {
    const [r1, g1, b1] = this.color.rgb().array();
    const [r2, g2, b2] = color2.color.rgb().array();
    return diff(r1, r2) + diff(g1, g2) + diff(b1, b2);
  }

  brightness(): number {
    return (this.red * 299 + this.green * 587 + this.blue * 114) / 1000;
  }

  brightnessDifference(color2: ThemeColor): number {
    return (
      Math.max(this.brightness(), color2.brightness()) -
      Math.min(this.brightness(), color2.brightness())
    );
  }
}

export function mix (a: number, b: number, r: number) {
  return (a * r + b * (100 - r)) / 100
}

export function diff (v1: number, v2: number) {
  return Math.max(v1, v2) - Math.min(v1, v2)
}

export function brightness (colorStr: string) {
  const [r, g, b] = Color(colorStr).rgb().array()
  return (r * 299 + g * 587 + b * 114) / 1000
}