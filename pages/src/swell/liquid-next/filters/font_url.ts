import { LiquidSwell } from '..';
import { ThemeFont } from '../font';

// {{ settings.type_header_font | font_url }}

export default function bind(_liquidSwell: LiquidSwell) {
  return (fontSetting: string) => {
    const font = ThemeFont.get(fontSetting);
    return font.url();
  };
}
