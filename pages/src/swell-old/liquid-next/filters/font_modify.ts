import { LiquidSwell } from '..';
import { ThemeFont } from '../font';

// {%- assign bold_font = settings.type_body_font | font_modify: 'weight', 'bold' -%}
// h2 { font-weight: {{ bold_font.weight }}; }
// Note: if property is invalid, returns null

export default function bind(_liquidSwell: LiquidSwell) {
  return (fontSetting: any, prop: string, value: string) => {
    const font = ThemeFont.get(fontSetting);
    return font.modify(prop, value);
  };
}
