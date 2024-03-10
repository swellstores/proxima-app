export type ThemeSettings = {
  [key: string]: any;
};

export type ThemePage = {
  [key: string]: any;
};

export type ThemeGlobals = {
  settings: ThemeSettings;
  menus: any;
  page: ThemePage;
  [key: string]: any;
};

export interface ThemeConfig extends ThemeSettings {
  id: string;
  type: string;
  file_data: string;
  file_path: string;
}

export interface ThemeBlock extends ThemeSettings {
  type: string;
  settings: ThemeSettings;
}

export interface ThemeSection extends ThemeSettings {
  type: string;
  disabled?: boolean;
  settings: ThemeSettings;
  blocks: {
    [key: string]: ThemeBlock;
  };
  block_order: string[];
}

export interface ThemeSectionGroup extends ThemeSettings {
  sections: {
    [key: string]: ThemeSection;
  };
  order: string[];
}

export type ThemeSectionConfig = {
  section: ThemeSection;
  tag: string;
  schema?: ThemeSettings;
  output?: string;
  settings?: ThemeSettings;
  class?: string;
};

export type GetThemeConfig = (fileName: string) => Promise<ThemeConfig | null>;

export type RenderTemplate = (
  config: ThemeConfig | null,
  data?: any,
) => Promise<string>;

export type RenderTemplateString = (
  templateString: string,
  data?: any,
) => Promise<string>;

export type RenderTemplateSections = (
  sections: ThemeSectionGroup,
  data?: any,
) => Promise<string>;

export type RenderLanguage = (
  key: string,
  locale?: string
) => Promise<string>;

export type RenderCurrency = (
  amount: number,
  params?: { code?: string; rate?: number; locale?: string; decimals?: number }
) => string;

export type GetAssetUrl = (assetPath: string) => string | null;
