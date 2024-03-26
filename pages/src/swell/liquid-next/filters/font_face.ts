import { LiquidSwell } from '..';
import { ThemeFont } from '../font';
import { paramsToProps } from '../utils';

// {{ settings.type_header_font | font_face }}

export default function bind(_liquidSwell: LiquidSwell) {
  return (fontSetting: any, params: any[]) => {
    if (fontSetting) {
      const font = ThemeFont.get(fontSetting);
      const options = paramsToProps(params);
      return font.face(options);
    }
    return null;
  };
}
