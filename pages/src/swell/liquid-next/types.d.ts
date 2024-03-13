type ThemeSettings = {
  [key: string]: any;
};

type ThemePage = {
  [key: string]: any; // TODO: fix this
};

type ThemeGlobals = {
  settings: ThemeSettings;
  menus: any;
  page: ThemePage;
  [key: string]: any;
};

type ThemeSection = {
  type: string;
  disabled?: boolean;
  settings: ThemeSettings;
  blocks: {
    [key: string]: ThemeBlock;
  };
  block_order: string[];
}

type ThemeBlock = {
  type: string;
  settings: ThemeSettings;
}

type ThemeSectionGroup = {
  sections: {
    [key: string]: ThemeSection;
  };
  order: string[];
}

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
  type?: string; // layout sections only
  name: string;
  tag?: string;
  class?: string;
  enabled_on?: ThemeSectionEnabledDisabled;
  disabled_on?: ThemeSectionEnabledDisabled;
  settings: ThemeSettingsSchema[];
  blocks?: ThemeBlockSchema[];
  presets?: ThemePresetSchema[];
};

interface ThemePageSectionSchema extends ThemeSectionSchema {
  id: string,
}

type ThemeLayoutSectionGroupSchema = {
  id: string,
  sectionConfigs: ThemeSectionGroupConfig[]
}

type ThemeSettingSchema = {
  id?: string;
  type: string;
  label: string;
  default?: any;
  [key: string]: any;
};

type ThemeBlockSchema = {
  type: string;
  name: string;
  limit?: number;
  settings: ThemeSettingsSchema[];
};

type ThemePresetSchema = {
  name: string;
  settings: ThemeSettingsSchema[];
  blocks?: ThemeBlockSchema[];
}

type ThemeSectionEnabledDisabled = {
  templates?: string[];
  groups?: string[];
};

type GetThemeConfig = (fileName: string) => Promise<SwellThemeConfig | null>;

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

type RenderLanguage = (
  key: string,
  locale?: string
) => Promise<string>;

type RenderCurrency = (
  amount: number,
  params?: { code?: string; rate?: number; locale?: string; decimals?: number }
) => string;

type GetAssetUrl = (assetPath: string) => string | null;
