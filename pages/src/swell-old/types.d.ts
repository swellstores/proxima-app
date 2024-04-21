type SwellErrorOptions = {
  status?: number;
  method?: string;
  endpointUrl?: string;
};

type SwellData = {
  [key: string]: any;
};

type SwellRecord = {
  id: string;
  [key: string]: any;
};

type SwellCollection = {
  count: number;
  results: SwellRecord[];
  page: number;
  pages: SwellCollectionPages;
  page_count: number;
};

type SwellCollectionPages = {
  [key: string]: {
    start: number;
    end: number;
  };
};

interface SwellThemeConfig extends SwellRecord {
  id: string;
  type: string;
  file_data: string;
  file_path: string;
}

type SwellMenu = {
  id: string;
  name: string;
  items: SwellMenuItem[];
  $locale: {
    [key: string]: {
      [key: string]: string;
    };
  };
};

enum SwellMenuItemType {
  Home = 'home',
  Search = 'search',
  Product = 'product',
  ProductList = 'product_list',
  Category = 'category',
  Page = 'page',
  Blog = 'blog',
  BlogCatgory = 'blog_category',
  Content = 'content',
  ContentList = 'content_list',
  Url = 'url',
  Heading = 'heading',
}

type SwellMenuItem = {
  name: string;
  type: SwellMenuItemType;
  items: SwellMenuItem[];
  model?: string;
  value?:
    | string
    | {
        [key: string]: any;
      };
  url?: string;
  $locale: {
    [key: string]: {
      [key: string]: string;
    };
  };
  // Dynamic properties
  resource?:
    | SwellStorefrontRecord
    | SwellStorefrontCollection
    | SwellStorefrontResource;
  levels: number;
  current?: boolean;
  active?: boolean;
  child_current?: boolean;
  child_active?: boolean;
};

type SwellStorefrontConfig = {
  editor?: boolean;
  pages?: Array<{
    id: string;
    url: string;
    label?: string;
    group?: string;
    icon?: string;
    templates?: boolean;
    expand_pages?: boolean;
    collection?: string;
    query?: SwellData;
    ajax?: boolean;
  }>;
  forms?: Array<{
    id: string;
    url: string;
    return_url?: string;
    params?: string[];
  }>;
};

declare class Swell {
  public headers: { [key: string]: string };
  public swellHeaders: { [key: string]: string };
  public backend?: SwellBackendAPI;
  public storefront: typeof SwellJS;
  public instanceId: string;
  public isPreview: boolean;
  public isEditor: boolean;
  public cache: Map<string, any>;
  static cache: Map<string, any>;

  constructor(options: {
    headers?: { [key: string]: any };
    swellHeaders?: { [key: string]: any };
    serverHeaders?: Headers; // Required on the server
    [key: string]: any;
  });

  static getSwellHeaders(serverHeaders: Headers): {
    headers: { [key: string]: string };
    swellHeaders: { [key: string]: string };
  };

  getClientProps(): {
    headers: { [key: string]: string };
    swellHeaders: { [key: string]: string };
    instanceId: string;
    isPreview: boolean;
    isEditor: boolean;
    cache: Map<string, any>;
    storefrontSettingStates: {
      state: any;
      menuState: any;
      paymentState: any;
      subscriptionState: any;
      sessionState: any;
    };
  };

  getCacheInstance(): Map<string, any>;

  getCachedSync(
    key: string,
    args?: Array<any> | Function,
    handler?: Function,
  ): any;

  getCached(
    key: string,
    args: Array<any> | Function,
    handler?: Function,
  ): Promise<any>;

  clearCache(): void;

  getStorefrontSettings(): Promise<SwellRecord>;

  getStorefrontMenus(): SwellMenu[];

  get(
    ...args: Parameters<SwellBackendAPI['get']>
  ): Promise<SwellData> | undefined;
  put(
    ...args: Parameters<SwellBackendAPI['get']>
  ): Promise<SwellData> | undefined;
  post(
    ...args: Parameters<SwellBackendAPI['get']>
  ): Promise<SwellData> | undefined;
  delete(
    ...args: Parameters<SwellBackendAPI['get']>
  ): Promise<SwellData> | undefined;
}

declare class SwellBackendAPI {
  public apiHost: string;
  public apiAuth: string;

  constructor(options: {
    storeId: string;
    accessToken: string;
    apiHost?: string;
  });

  makeRequest(method: string, url: string, data?: object): Promise<SwellData>;

  stringifyQuery(queryObject: object, prefix?: string): string;

  get(url: string, query?: SwellData): Promise<SwellData>;

  put(url: string, data: SwellData): Promise<SwellData>;

  post(url: string, data: SwellData): Promise<SwellData>;

  delete(url: string, data?: SwellData): Promise<SwellData>;
}

interface SwellThemeInitOptions {
  pageId?: string;
  url?: URL;
}

declare class SwellTheme {
  public swell: Swell;
  public liquidSwell: LiquidSwell;
  public storefrontConfig?: SwellStorefrontConfig;

  public url: URL | undefined;
  public page: any;
  public pageId: string | undefined;
  public globals: ThemeGlobals | undefined;
  public request: ThemeSettings | null;
  public shopifyCompatibility: SwellStorefrontShopifyCompatibility | null;
  public shopifyCompatibilityClass: typeof ShopifyCompatibility;

  constructor(
    swell: Swell,
    options?: {
      storefrontConfig: SwellStorefrontConfig;
      shopifyCompatibilityClass: typeof ShopifyCompatibility;
    },
  );

  initGlobals(options: SwellThemeInitOptions): Promise<void>;

  setGlobals(globals: ThemeGlobals, url?: URL): void;

  getSettingsAndConfigs(): Promise<{ store: SwellData; configs: any }>;

  resolvePageData(
    configs: SwellData,
    pageId?: string,
  ): {
    settings: ThemeSettings;
    page: ThemeSettings;
  };

  setCompatibilityData(pageData: SwellData): void;

  lang(key: string, data?: any): Promise<string>;

  themeConfigQuery(): SwellData;

  getAllThemeConfigs(): Promise<SwellCollection>;

  getThemeConfig(filePath: string): Promise<SwellThemeConfig | null>;

  getThemeTemplateConfig(filePath: string): Promise<SwellThemeConfig | null>;

  getAssetUrl(filePath: string): string | null;

  renderTemplate(
    config: SwellThemeConfig | null,
    data?: SwellData,
  ): Promise<string>;

  renderTemplateString(
    templateString: string,
    data?: SwellData,
  ): Promise<string>;

  getSectionSchema(
    sectionName: string,
  ): Promise<ThemeSectionSchema | undefined>;

  renderThemeTemplate(
    filePath: string,
    data?: SwellData,
  ): Promise<string | ThemeSectionGroup>;

  renderLayoutTemplate(name: string, data?: SwellData): Promise<string>;

  renderPageTemplate(
    name: string,
    data?: SwellData,
    altTemplateId?: string,
  ): Promise<string | ThemeSectionGroup>;

  renderPage(
    pageData?: SwellData,
    altTemplateId?: string,
  ): Promise<string | ThemeSectionGroup>;

  renderLayout(data?: SwellData): Promise<string>;

  getSectionGroupConfigs(
    sectionGroup: ThemeSectionGroup,
  ): Promise<ThemeSectionGroupConfig[]>;

  getPageSections(): Promise<any>;

  getLayoutSectionGroups(): Promise<any>;

  renderPageSections(
    sectionGroup: ThemeSectionGroup,
    data: SwellData,
  ): Promise<ThemeSectionGroupConfig[]>;

  renderSectionConfigs(
    sectionConfigs: ThemeSectionGroupConfig[],
    data: SwellData,
  ): Promise<ThemeSectionGroupConfig[]>;

  renderTemplateSections(
    sectionGroup: ThemeSectionGroup,
    data: SwellData,
  ): Promise<string>;

  renderLanguage(key: string, data?: any): Promise<string>;

  renderCurrency(amount: number, params: any): string;
}

type StorefrontResourceGetter = () => Promise<SwellData> | SwellData;

declare class StorefrontResource {
  public _getter: StorefrontResourceGetter | undefined;
  public _result: SwellData | null | undefined;
  [key: string]: any;

  constructor(getter?: StorefrontResourceGetter);

  _getProxy(): any;

  _get(..._args: any): Promise<any>;

  /* setCompatibilityData(
    proxy: any,
    compatibilityInstance: ShopifyCompatibility,
    pageData: SwellData,
  ): void;

  setCompatibilityProps(result: any): void; */
}

declare class SwellStorefrontResource extends StorefrontResource {
  public _swell?: Swell;
  public _resource: any;
  public _compatibilityInstance: ShopifyCompatibility | null;

  public readonly _collection: string;
  public _query: SwellData = {};

  constructor(
    swell: Swell,
    collection: string,
    getter?: StorefrontResourceGetter,
  );

  getResourceObject: () => {
    get: (id: string, query?: SwellData) => Promise<SwellData>;
    list: (query?: SwellData) => Promise<SwellData>;
  };
}

declare class SwellStorefrontCollection extends SwellStorefrontResource {
  public results: SwellRecord[];
  public count: number;
  public page: number;
  public pages: SwellCollectionPages;
  public page_count: number;

  constructor(
    swell: Swell,
    collection: string,
    query: SwellData = {},
    getter?: StorefrontResourceGetter,
  );

  static get(
    swell: Swell,
    collection: string,
    query: SwellData,
  ): SwellStorefrontCollection;

  _get(query: SwellData): Promise<SwellStorefrontCollection>;
}

declare class SwellStorefrontRecord extends SwellStorefrontResource {
  [key: string]: any;

  constructor(
    swell: Swell,
    collection: string,
    id: string,
    query: SwellData = {},
    getter?: StorefrontResourceGetter,
  );

  static get(
    swell: Swell,
    collection: string,
    id: string,
    query: SwellData,
  ): SwellStorefrontRecord;

  _get(id: string, query: SwellData): Promise<any>;
}

declare class ShopifyCompatibility {
  public swell: Swell;
  public pageId?: string;
  public pageResourceMap?: ShopifyPageResourceMap;
  public objectResourceMap?: ShopifyObjectResourceMap;

  constructor(swell: Swell);

  adaptGlobals: (globals: any, serverParams: any) => void;

  getPageType: (pageId: string) => string;

  getPageRouteUrl: (pageId: string) => string;

  getPageRouteMap: () => { [key: string]: string };

  getThemeFilePath: (type: string, name: string) => string;

  /* getResourceData: (resource: StorefrontResource) => SwellData;

  getResourceProps: (resource: StorefrontResource) => SwellData; */

  getPageResourceMap: () => ShopifyPageResourceMap;

  getObjectResourceMap: () => ShopifyObjectResourceMap;

  getMenuData: (menu: SwellMenu) => SwellData;

  getLookupData: (
    collection: string,
    setting: ThemeSettingFieldSchema,
    value: any,
    defaultHandler: () => SwellData | null,
  ) => SwellData | null;

  getFontFromShopifySetting: (fontSetting: string) => string | null;

  getEditorConfig: (settingsSchema: ShopifySettingsSchema) => ThemeEditorSchema;
  getThemeConfig: (settingsData: ShopifySettingsData) => ThemeSettings;
  getPresetsConfig: (settingsData: ShopifySettingsData) => SwellData;
  getSectionConfig: (sectionSchema: ShopifySectionSchema) => ThemeSectionSchema;
}

type ShopifyPageResourceMap = Array<{
  page: string;
  resources: Array<{
    from: string;
    to: string;
    object: ShopifyResource;
  }>;
}>;

type ShopifyObjectResourceMap = Array<{
  from: any;
  object: ShopifyResource;
}>;