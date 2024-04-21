type ShopifyBasicInputType =
  | 'text'
  | 'textarea'
  | 'select'
  | 'checkbox'
  | 'radio'
  | 'number'
  | 'range';

type ShopifySpecializedInputType =
  | 'article'
  | 'blog'
  | 'collection'
  | 'collection_list'
  | 'color'
  | 'color_background'
  | 'color_scheme'
  | 'color_scheme_group'
  | 'font_picker'
  | 'html'
  | 'image_picker'
  | 'inline_richtext'
  | 'link_list'
  | 'liquid'
  | 'page'
  | 'page'
  | 'product'
  | 'product_list'
  | 'richtext'
  | 'text_alignment'
  | 'url'
  | 'video'
  | 'video_url';

type ShopifySettingSchema = {
  type: ShopifyBasicInputType | ShopifySpecializedInputType;
  label: string;
  id?: string;
  info?: string;
  default?: any;
  placeholder?: string;

  // select
  options?: Array<{
    label: string;
    value: string;
  }>;
  group?: string;

  // range
  min?: number;
  max?: number;
  step?: number;
  unit?: string;

  // collection_list
  limit?: number;

  // color_scheme_group
  definition?: Array<{
    type: 'header' | 'color' | 'color_background';
    label: string;
    id?: string;
    info?: string;
    default?: any;
    placeholder?: string;
  }>;
  role?: {
    background:
      | string
      | {
          solid: string;
          gradient: string;
        };
    primary_button:
      | string
      | {
          solid: string;
          gradient: string;
        };
    secondary_button:
      | string
      | {
          solid: string;
          gradient: string;
        };
    text: string;
    on_primary_button: string;
    primary_button_border: string;
    on_secondary_button: string;
    secondary_button_border: string;
    icons: string;
    links: string;
  };

  // video_url
  accept?: Array<string>; // youtube, vimeo, or both
};

type ShopifySettingSection = {
  name: string;
  settings?: Array<ShopifySettingSchema>;
};

type ShopifySettingsSchema = Array<ShopifySettingSection>;

type ShopifySettingsData = {
  current: {
    [key in string]: any;
  };
  presets: {
    [key in string]: {
      [key in string]: any;
    };
  };
};

type ShopifySectionBlockSchema = {
  type: string;
  name: string;
  limit?: number;
  settings: ShopifySettingSchema[];
};

type ShopifySectionPresetSchema = {
  name: string;
  settings: ShopifySettingSchema[];
  blocks?: ShopifySectionBlockSchema[];
};

type ShopifySectionSchema = {
  type?: string; // layout sections only
  name: string;
  tag?: string;
  class?: string;
  enabled_on?: ThemeSectionEnabledDisabled;
  disabled_on?: ThemeSectionEnabledDisabled;
  settings: ShopifySettingSchema[];
  blocks?: ShopifySectionBlockSchema[];
  presets?: ShopifySectionPresetSchema[];
};
