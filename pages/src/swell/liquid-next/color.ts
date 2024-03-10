import Color from "color";

export type ColorParam =
  | Color
  | string
  | ArrayLike<number>
  | number
  | { [key: string]: any };

export class ThemeColor {
  public value: string;
  public color: Color;
  public colorValues: ColorParam;
  public red: number;
  public green: number;
  public blue: number;

  constructor(value: string) {
    this.value = value;
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
    return this.value;
  }

  lighten(percent: any) {
    const percentVal = Number(percent);
    return new ThemeColor(this.color.lighten(percentVal / 100).hex());
  }

  darken(percent: any) {
    const percentVal = Number(percent);
    return new ThemeColor(this.color.darken(percentVal / 100).hex());
  }

  /**
   * Color perceived brightness/difference algorithms from https://www.w3.org/WAI/ER/WD-AERT/#color-contrast
   */

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
