import SwellJS from "swell-js";
import { AstroGlobal } from "astro";
import { toBase64 } from "./utils";

const DEFAULT_API_HOST = "https://api.schema.io";
const CACHE_TIMEOUT = 1000 * 60 * 1; // 1min
const SWELL_CLIENT_HEADERS = [
  "swell-store-id",
  "swell-public-key",
  "swell-admin-url",
  "swell-vault-url",
  "swell-environment-id",
  "swell-deployment-mode",
  "swell-theme-id",
  "swell-theme-branch-id",
];

export class Swell {
  public Astro?: AstroGlobal;
  public headers: { [key: string]: string };
  public swellHeaders: { [key: string]: string };
  public backend?: SwellBackendAPI;
  public storefront: typeof SwellJS;
  public instanceId: string = "";
  public isPreview: boolean = false;
  public isEditor: boolean = false;

  // Preview uses instance cache
  public cache: Map<string, any> = new Map();

  // Live uses static cache
  static cache: Map<string, any> = new Map();

  constructor({ Astro, ...clientProps }: { Astro?: AstroGlobal, [key: string]: any }) {
    this.Astro = Astro;

    if (Astro) {
      const { headers, swellHeaders } = Swell.getSwellHeaders(Astro);

      this.headers = headers;
      this.swellHeaders = swellHeaders;

      this.backend = new SwellBackendAPI({
        storeId: swellHeaders["store-id"],
        accessToken: swellHeaders["access-token"],
        apiHost: swellHeaders["api-host"],
      });

      // TODO: make a create method to separate instanced of swell.js
      this.storefront = SwellJS;
      this.storefront.init(swellHeaders["store-id"], swellHeaders["public-key"], {
        url: swellHeaders["admin-url"],
        vaultUrl: swellHeaders["vault-url"],
      });

      this.instanceId = [
        "store-id",
        "environment-id",
        "deployment-mode",
        "theme-id",
        "theme-branch-id",
      ]
        .map((key) => swellHeaders[key])
        .join("_");

      this.isPreview = clientProps.isEditor || swellHeaders["deployment-mode"] === "preview";
      this.isEditor = clientProps.isEditor ?? swellHeaders["deployment-mode"] === "editor";

      // Clear cache if header changed
      if (swellHeaders["cache-modified"]) {
        const cacheModified = this.getCachedSync("_cache-modified");
        if (cacheModified !== swellHeaders["cache-modified"]) {
          this.clearCache();
        }

        this.getCacheInstance().set(
          "_cache-modified",
          swellHeaders["cache-modified"],
        );
      }
    } else {
      // Set props from cache, typically used when hydrating client-side
      const { headers, swellHeaders } = clientProps;
      Object.assign(this, clientProps);

      this.headers = headers;
      this.swellHeaders = swellHeaders;

      // TODO: make a create method to separate instanced of swell.js
      this.storefront = SwellJS;
      this.storefront.init(swellHeaders["store-id"], swellHeaders["public-key"], {
        url: swellHeaders["admin-url"],
        vaultUrl: swellHeaders["vault-url"],
      });

      Object.assign(this.storefront.settings, clientProps.storefrontSettingStates);
    }
  }

  static getSwellHeaders(Astro: AstroGlobal): {
    headers: { [key: string]: string };
    swellHeaders: { [key: string]: string };
  } {
    const headers: { [key: string]: string } = {};
    const swellHeaders: { [key: string]: string } = {};
    const headersList = Astro.request.headers;

    headersList.forEach((value: string, key: string) => {
      headers[key] = value;
      if (key.startsWith("swell-")) {
        swellHeaders[key.replace("swell-", "")] = value || "";
      }
    });

    return { headers, swellHeaders };
  }

  getClientProps() {
    const clientHeaders = SWELL_CLIENT_HEADERS.reduce((acc, key) => {
      acc[key] = this.headers[key];
      return acc;
    }, {} as { [key: string]: string });

    const clientSwellHeaders = SWELL_CLIENT_HEADERS.reduce((acc, key) => {
      const swellKey = key.replace('swell-', '');
      acc[swellKey] = this.swellHeaders[swellKey];
      return acc;
    }, {} as { [key: string]: string });

    const storefrontSettings = (this.storefront.settings as any);
    
    return {
      headers: clientHeaders,
      swellHeaders: clientSwellHeaders,
      instanceId: this.instanceId,
      isPreview: this.isPreview,
      isEditor: this.isEditor,
      cache: this.cache,
      storefrontSettingStates: {
        state: storefrontSettings.state,
        menuState: storefrontSettings.menuState,
        paymentState: storefrontSettings.paymentState,
        subscriptionState: storefrontSettings.subscriptionState,
        sessionState: storefrontSettings.sessionState,
      }
    };
  }

  getCacheInstance() {
    if (this.isPreview) {
      return this.cache;
    }

    let cacheInstance = Swell.cache.get(this.instanceId);
    if (!cacheInstance) {
      cacheInstance = new Map();
      Swell.cache.set(this.instanceId, cacheInstance);
    }

    return cacheInstance;
  }

  getCachedSync(
    key: string,
    args?: Array<any> | Function,
    handler?: Function,
  ): any {
    const cacheArgs = typeof args === "function" ? undefined : args;
    const cacheHandler = typeof args === "function" ? args : handler;
    const cacheKey = `${this.instanceId}:${key}_${JSON.stringify(cacheArgs)}`;
    const cacheInstance = this.getCacheInstance();

    if (cacheInstance.has(cacheKey)) {
      return cacheInstance.get(cacheKey);
    }

    if (cacheHandler) {
      const result = cacheHandler();
      if (result instanceof Promise) {
        result.then((data) => cacheInstance.set(cacheKey, data));
      } else {
        cacheInstance.set(cacheKey, result);
      }

      // Clear live cache only, since preview lives just for the duration of the request
      if (!this.isPreview) {
        setTimeout(() => cacheInstance.delete(cacheKey), CACHE_TIMEOUT);
      }

      return result;
    }
  }

  async getCached(
    key: string,
    args: Array<any> | Function,
    handler?: Function,
  ): Promise<any> {
    return await this.getCachedSync(key, args, handler);
  }

  clearCache() {
    Swell.cache.delete(this.instanceId);
  }

  async getStorefrontSettings(): Promise<SwellRecord> {
    return await this.getCached("storefront-settings", () =>
      this.storefront.settings.get(),
    );
  }

  get(...args: Parameters<SwellBackendAPI["get"]>) {
    return this.backend?.get(...args);
  }

  put(...args: Parameters<SwellBackendAPI["put"]>) {
    return this.backend?.put(...args);
  }

  post(...args: Parameters<SwellBackendAPI["post"]>) {
    return this.backend?.post(...args);
  }

  delete(...args: Parameters<SwellBackendAPI["delete"]>) {
    return this.backend?.delete(...args);
  }
}

export class SwellBackendAPI {
  public apiHost: string = DEFAULT_API_HOST;
  public apiAuth: string = "";

  constructor({
    storeId,
    accessToken,
    apiHost,
  }: {
    storeId: string;
    accessToken: string;
    apiHost?: string;
  }) {
    this.apiHost = apiHost || DEFAULT_API_HOST;
    this.apiAuth = toBase64(`${storeId}:${accessToken}`);
  }

  async makeRequest(method: string, url: string, data?: object) {
    const requestOptions: {
      method: string;
      headers: { [key: string]: string };
      body?: string;
    } = {
      method,
      headers: {
        Authorization: `Basic ${this.apiAuth}`,
        "User-Agent": "swell-functions/1.0",
        "Content-Type": "application/json",
      },
    };

    let query = "";

    if (data) {
      try {
        if (method === "GET") {
          query = `?${this.stringifyQuery(data)}`;
        } else {
          requestOptions.body = JSON.stringify(data);
          requestOptions.headers["Content-Length"] = String(
            requestOptions.body.length,
          );
        }
      } catch {
        throw new Error(`Error serializing data: ${data}`);
      }
    }

    const endpointUrl = String(url).startsWith("/") ? url.substring(1) : url;

    const response = await fetch(
      `${this.apiHost}/${endpointUrl}${query}`,
      requestOptions,
    );

    const responseText = await response.text();

    let result;
    try {
      result = JSON.parse(responseText);
    } catch {
      result = String(responseText || "").trim();
    }

    if (response.status > 299) {
      throw new SwellError(result, {
        status: response.status,
        method,
        endpointUrl,
      });
    } else if (method !== "GET" && result?.errors) {
      throw new SwellError(result.errors, { status: 400, method, endpointUrl });
    }

    return result;
  }

  stringifyQuery(queryObject: object, prefix?: string): string {
    const result = [];

    for (const [key, value] of Object.entries(queryObject)) {
      const prefixKey = prefix ? `${prefix}[${key}]` : key;
      const isObject = value !== null && typeof value === "object";
      const encodedResult = isObject
        ? this.stringifyQuery(value, prefixKey)
        : `${encodeURIComponent(prefixKey)}=${
            value === null ? "" : encodeURIComponent(value)
          }`;

      result.push(encodedResult);
    }

    return result.join("&");
  }

  async get(url: string, query?: object): Promise<any> {
    return this.makeRequest("GET", url, query);
  }

  async put(url: string, data: any): Promise<any> {
    return this.makeRequest("PUT", url, data);
  }

  async post(url: string, data: any) {
    return this.makeRequest("POST", url, data);
  }

  async delete(url: string, data?: any) {
    return this.makeRequest("DELETE", url, data);
  }
}

export class SwellError extends Error {
  status: number = 200;

  constructor(message: string, options: SwellErrorOptions = {}) {
    let formattedMessage;
    if (typeof message === "string") {
      formattedMessage = message;
    } else {
      formattedMessage = JSON.stringify(message, null, 2);
    }

    if (options.method && options.endpointUrl) {
      formattedMessage = `${options.method} /${options.endpointUrl}\n${formattedMessage}`;
    }

    super(formattedMessage);
    this.name = "SwellError";
    this.status = options.status || 500;
  }
}
