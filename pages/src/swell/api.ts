import swellStorefront from "swell-js";

export { swellStorefront };

const DEFAULT_API_HOST = "https://api.schema.io";

let API_BACKEND_HOST: string = DEFAULT_API_HOST;
let API_BACKEND_AUTH: string = toBase64(
  "test:sk_test_xjT2cmaz9eMzNfhx0WMSj5ZC4DMFTlBP"
);

export async function getSwellHeaders(Astro: any): Promise<{
  [key: string]: string;
}> {
  const swellHeaders: { [key: string]: string } = {};
  const headersList = Astro.request.headers;

  headersList.forEach((value: string, key: string) => {
    if (key.startsWith("swell-")) {
      swellHeaders[key.replace("swell-", "")] = value || "";
    }
  });

  return swellHeaders;
}

export async function setSwellCredentials(Astro: any): Promise<void> {
  const swellHeaders = await getSwellHeaders(Astro);

  API_BACKEND_HOST = swellHeaders["api-host"] || DEFAULT_API_HOST;
  API_BACKEND_AUTH = toBase64(
    `${swellHeaders["store-id"]}:${swellHeaders["access-token"]}`
  );

  swellStorefront.init(swellHeaders["store-id"], swellHeaders["public-key"], {
    url: swellHeaders["admin-url"],
    vaultUrl: swellHeaders["vault-url"],
  });
}

export function toBase64(inputString: string): string {
  const utf8Bytes = new TextEncoder().encode(inputString);
  let base64String = "";

  for (let i = 0; i < utf8Bytes.length; i += 3) {
    const chunk = Array.from(utf8Bytes.slice(i, i + 3));
    base64String += btoa(String.fromCharCode(...chunk));
  }

  return base64String;
}

export class SwellAPI {
  async makeRequest(method: string, url: string, data?: object) {
    const requestOptions: {
      method: string;
      headers: { [key: string]: string };
      body?: string;
    } = {
      method,
      headers: {
        Authorization: `Basic ${API_BACKEND_AUTH}`,
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
            requestOptions.body.length
          );
        }
      } catch {
        throw new Error(`Error serializing data: ${data}`);
      }
    }

    const endpointUrl = String(url).startsWith("/") ? url.substring(1) : url;

    const response = await fetch(
      `${API_BACKEND_HOST}/${endpointUrl}${query}`,
      requestOptions
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

export interface SwellErrorOptions {
  status?: number;
  method?: string;
  endpointUrl?: string;
}

export type SwellData = any;

export interface SwellRecord {
  id: string;
  [key: string]: SwellData;
}

export interface SwellResult {
  count: number;
  results: Array<SwellRecord>;
  pages: Array<object>;
  page_count: number;
}
