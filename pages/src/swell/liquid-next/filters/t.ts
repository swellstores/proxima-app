import { LiquidSwell } from "..";

// {{ 'language.key' | t: 'default value' }}

export default function bind(liquidSwell: LiquidSwell) {
  return async (key: string, defaultValue?: any) => {
    return await liquidSwell.renderLanguage(key, defaultValue);
  };
}
