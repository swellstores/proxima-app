type ThemeSettings = {
  [key: string]: any;
};

type ThemePage = {
  [key: string]: any; // TODO: fix this
};

interface ThemeGlobals extends SwellData {
  store?: ThemeSettings;
  settings?: ThemeSettings;
  menus?: { [key: string]: SwellMenu };
  page?: ThemePage;
  configs?: ThemeConfigs;
  [key: string]: any;
}

type ThemeConfigs = {
  editor: ThemeEditorSchema;
  theme: ThemeSettings;
  presets: ThemePresetSchema[];
  language: ThemeSettings;
  'language-editor'?: ThemeEditorSchema;
  [key: string]: any;

  // Shopify compatibility
  settings_schema?: any;
  settings_data?: any;
};

type ThemeEditorSchema = {
  settings?: ThemeSettingSectionSchema[];
  language?: ThemeSettingSectionSchema[];
  menus?: any; // TODO menu schema
};

type ThemeSection = {
  type: string;
  disabled?: boolean;
  settings: ThemeSettings;
  blocks: {
    [key: string]: ThemeBlock;
  };
  block_order: string[];
};

type ThemeBlock = {
  type: string;
  settings: ThemeSettings;
};

type ThemeSectionGroup = {
  sections: {
    [key: string]: ThemeSection;
  };
  order: string[];
};

type ThemeSectionGroupConfig = {
  id: string;
  section: ThemeSection;
  tag: string;
  schema?: ThemeSectionSchema | null;
  output?: string;
  settings?: ThemeSettings;
  class?: string;
};

type ThemeSectionSchema = {
  label: string;
  settings: ThemeSettingFieldSchema[];
  type?: string; // layout sections only
  tag?: string;
  class?: string;
  enabled_on?: ThemeSectionEnabledDisabled;
  disabled_on?: ThemeSectionEnabledDisabled;
  blocks?: ThemeBlockSchema[];
  presets?: ThemePresetSchema[];
};

type ThemeSettingBasicInputType =
  | 'short_text'
  | 'long_text'
  | 'boolean'
  | 'number'
  | 'date'
  | 'select'
  | 'asset'
  | 'tags'
  | 'collection'
  | 'color'
  | 'color_scheme'
  | 'color_scheme_group'
  | 'font_family'
  | 'lookup'
  | 'generic_lookup'
  | 'menu'
  | 'icon'
  | 'field_group'
  | 'field_row';

type ThemeSettingAliasInputType =
  | 'text'
  | 'textarea'
  | 'rich_text'
  | 'asset'
  | 'phone'
  | 'email'
  | 'url'
  | 'slug'
  | 'basic_html'
  | 'rich_html'
  | 'markdown'
  | 'liquid'
  | 'checkbox'
  | 'toggle'
  | 'image'
  | 'document'
  | 'video'
  | 'radio'
  | 'dropdown'
  | 'checkboxes'
  | 'integer'
  | 'float'
  | 'currency'
  | 'percent'
  | 'slider'
  | 'time'
  | 'datetime'
  | 'child_collection'
  | 'product_lookup'
  | 'category_lookup'
  | 'customer_lookup';

type ThemeSettingFieldSchema = {
  type: ThemeSettingBasicInputType | ThemeSettingAliasInputType;
  label: string;
  id?: string;
  default?: any;
  hint?: string;
  description?: string;
  placeholder?: string;
  value_type?: string;
  fallback?: any;
  required?: boolean;
  fields?: Array<ThemeSettingFieldSchema>;
  localized?: boolean;

  // short_text
  format?: string;

  // short_text, long_text, number, date
  min?: number;
  max?: number;

  // number
  increment?: number;
  unit?: string;
  digits?: number;

  // select, asset
  multi?: boolean;

  // select
  options?: Array<{
    label: string;
    value: string;
  }>;

  // asset
  asset_types?: Array<'image' | 'video' | 'document'>;

  // collection, lookup
  collection?: string;

  // collection
  item_types?: Array<string>;
  item_label?: string;
  icon?: string;
  child?: boolean;
  link?: {
    url: string;
    data?: SwellData;
    params?: SwellData;
  };

  // lookup
  collection_parent_id?: string;
  collection_parent_field?: string;
  model?: string;
  key?: string;
  key_field?: string;
  name_pattern?: string;
  query?: SwellData;
  params?: SwellData;
  limit?: number;
};

type ThemeSettingSectionSchema = {
  label: string;
  id?: string;
  fields: ThemeSettingFieldSchema[];
};

interface ThemePageSectionSchema extends ThemeSectionSchema {
  id: string;
}

type ThemeLayoutSectionGroupSchema = {
  id: string;
  sectionConfigs: ThemeSectionGroupConfig[];
};

type ThemeBlockSchema = {
  type: string;
  label: string;
  limit?: number;
  settings: ThemeSettingFieldSchema[];
};

type ThemePresetSchema = {
  label: string;
  settings?: ThemeSettings;
  blocks?: ThemeBlock[];
};

type ThemeSectionEnabledDisabled = {
  templates?: string[];
  groups?: string[];
};

type GetThemeConfig = (fileName: string) => Promise<SwellThemeConfig | null>;

type GetThemeTemplateConfigByType = (
  type: string,
  name: string,
) => Promise<SwellThemeConfig | null | undefined>;

type GetAssetUrl = (assetPath: string) => string | null;

type RenderTemplate = (
  config: SwellThemeConfig | null,
  data?: any,
) => Promise<string>;

type RenderTemplateString = (
  templateString: string,
  data?: any,
) => Promise<string>;

type RenderTemplateSections = (
  sections: ThemeSectionGroup,
  data?: any,
) => Promise<string>;

type RenderLanguage = (key: string, locale?: string) => Promise<string>;

type RenderCurrency = (
  amount: number,
  params?: { code?: string; rate?: number; locale?: string; decimals?: number },
) => string;

type ResolveFilePath = (fileName: string, extName?: string) => string;

type ThemeFontConfig = {
  family: string;
  fallback?: string;
  axes: Array<'wght' | 'wdth' | 'slnt' | 'opsz' | 'ital'>;
  variants: ThemeFontVariant[];
  system?: boolean;
};

type ThemeFontVariant = {
  wght?: number;
  wdth?: number;
  slnt?: number;
  opsz?: number;
  ital?: number;
};

type ThemeFontVariantSetting = {
  family: string;
  weight?: number;
  style?: 'normal' | 'italic' | 'oblique' | string;
  variant?: ThemeFontVariant;
};

declare class ThemeFont {
  id: string;
  family: string;
  weight: number;
  style: string;
  fallback_families: string;

  system: boolean;
  variant: ThemeFontVariant;

  variants: ThemeFont[];
  definition: ThemeFontConfig;

  constructor(fontSetting: ThemeFontVariantSetting | string);

  static get(fontSetting: string | ThemeFont): ThemeFont;

  static stringToSetting(fontSetting: string): ThemeFontVariantSetting;

  static settingToString(setting: ThemeFontVariantSetting): string;

  static resolveSetting(
    setting: ThemeFontVariantSetting,
  ): ThemeFontVariantSetting;

  static combinedGoogleFontUrl(fonts: any[]): string;

  toString(): string;

  googleFamily(): string;

  url(): string;

  face(options?: { font_display?: string }): string;

  modify(prop: string, value: string): ThemeFont;
}