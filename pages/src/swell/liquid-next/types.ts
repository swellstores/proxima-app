export type ThemeSettings = {
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

export type GetAssetUrl = (assetPath: string) => string | null;
