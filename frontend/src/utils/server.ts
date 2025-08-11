import { minimatch } from 'minimatch';
import { match } from 'path-to-regexp';
import qs from 'qs';
import {
  type Swell,
  type SwellTheme,
  type SwellData,
  StorefrontResource,
  dehydrateSwellRefsInStorefrontResources,
} from '@swell/apps-sdk';

import {
  initSwell,
  initTheme,
  getCookie,
  setCookie,
  deleteCookie,
  getSwellDataCookie,
  updateSwellDataCookie,
} from '@/swell';

import type { APIContext, MiddlewareHandler, MiddlewareNext } from 'astro';

export interface SwellServerContext<T extends SwellData = SwellData> {
  params: T;
  swell: Swell;
  theme: SwellTheme;
  context: APIContext;
}

declare global {
  interface Request {
    parsedBody?: FormData;
    parsedJson?: Record<string, unknown>;
  }
}

export type SwellServerNext = MiddlewareNext;

function isEditorRequest(context: APIContext): boolean {
  // We can use context.request.headers.get('swell-deployment-mode') === 'editor' when different URLs are used
  const isEditor = Boolean(context.request.headers.get('Swell-Is-Editor'));
  return isEditor && !context.locals.raw;
}

async function handleResponse<T extends SwellData = SwellData>(
  result: Response,
  swellContext: SwellServerContext<T>,
): Promise<Response> {
  // return json for editor form actions instead of redirect
  if (isEditorRequest(swellContext.context)) {
    return sendServerResponse(
      {
        isEditor: true,
        redirect: result.headers.get('Location'),
        status: result.status,
      },
      swellContext,
    );
  }

  return result;
}

export function handleServerRequest<T extends SwellData = SwellData>(
  handler: (
    context: SwellServerContext<T>,
  ) => Promise<Response | string | object> | Response | string | object,
): (
  context: APIContext,
  contextHandler?: (context: SwellServerContext<T>) => void,
) => Promise<Response | undefined> {
  return async (
    context: APIContext,
    contextHandler?: (context: SwellServerContext<T>) => void,
  ) => {
    const serverContext = await initServerContext<T>(context);

    try {
      const result = await handler(serverContext);

      if (result === undefined) {
        return result;
      }

      if (result instanceof Response) {
        return handleResponse(result, serverContext);
      }

      if (contextHandler) {
        contextHandler(serverContext);
      }

      return sendServerResponse(result, serverContext);
    } catch (err: unknown) {
      return sendServerError(err);
    }
  };
}

export function handleMiddlewareRequest<T extends SwellData = SwellData>(
  method: string,
  urlParam: string | string[] | ((pathname: string) => boolean),
  handler: (context: SwellServerContext<T>, next: SwellServerNext) => unknown,
): MiddlewareHandler {
  const matchHandler = getMiddlewareMatcher(urlParam);

  return async (context, next) => {
    if (method !== context.request.method) {
      return next();
    }

    const matchParam = matchHandler(context);
    if (!matchParam) {
      return next();
    }

    const serverContext = await initServerContext<T>(context);

    if (typeof matchParam === 'object') {
      serverContext.params = {
        ...serverContext.params,
        ...matchParam,
      };
    }

    const { theme } = serverContext;

    try {
      const result = await handler(serverContext, next);

      if (result instanceof Response) {
        await preserveThemeRequestData(context, theme);
        return handleResponse(result, serverContext);
      }

      if (result === undefined) {
        return next();
      }

      return sendServerResponse(result, serverContext);
    } catch (err: unknown) {
      return sendServerError(err);
    }
  };
}

async function initServerContext<T extends SwellData = SwellData>(
  context: APIContext,
): Promise<SwellServerContext<T>> {
  // use request swell-data if provided
  const swellData = context.request.headers.get('Swell-Data');
  if (swellData) {
    updateSwellDataCookie(context, swellData);
  }
  // use request session if provided. Can be provided without swell-data
  const session = context.request.headers.get('X-Session');
  if (session) {
    setCookie(context, 'swell-session', session);
  }

  const swell: Swell = context.locals.swell || initSwell(context);
  context.locals.swell = swell;

  const theme: SwellTheme = context.locals.theme || initTheme(swell);

  if (!context.locals.theme) {
    // Initialize currency and locale
    await theme.swell.getStorefrontSettings();

    context.locals.theme = theme;
  }

  const params =
    context.locals.params ||
    (await getFormParams(context.request, context.url.searchParams));
  context.locals.params = params;

  return {
    params,
    swell,
    theme,
    context,
  };
}

export function isResponseSent(request: Request): boolean {
  return Boolean(Reflect.get(request, Symbol.for('astro.responseSent')));
}

export async function sendServerResponse<T extends SwellData = SwellData>(
  result: unknown,
  swellContext: SwellServerContext<T>,
): Promise<Response> {
  const { theme, context } = swellContext;

  if (theme.shopifyCompatibility) {
    theme.setCompatibilityData(result as SwellData);
  }

  let response = await resolveAsyncResources(result as SwellData);

  dehydrateSwellRefsInStorefrontResources(response);

  if (typeof response === 'string') {
    response = {
      response,
    };
  } else if (!response) {
    response = {};
  }

  if (isEditorRequest(context)) {
    // set form cookies
    await preserveThemeRequestData(context, theme);
    // return swell-data cookie
    response.swellData = getSwellDataCookie(context);
  }

  return jsonResponse(response);
}

export function sendServerError(err: unknown): Response {
  if (!err.code) {
    console.error(err);
  }

  return jsonResponse(
    {
      message: 'Something went wrong',
      description: err.code ? err.message : 'Internal server error',
      errors: err.code ? { [err.code]: err.message } : undefined,
      status: err.status || 500,
    },
    {
      status: err.status || 500,
    },
  );
}

export async function getShopifyCompatibleServerParams(
  formType: string,
  swellContext: SwellServerContext,
) {
  const { theme, params } = swellContext;

  let result = params;

  if (theme.shopifyCompatibility) {
    const compatParams =
      await theme.shopifyCompatibility.getAdaptedFormServerParams(
        formType,
        swellContext,
      );
    if (compatParams !== undefined) {
      result = compatParams;
    }
  }

  return result;
}

export async function getShopifyCompatibleServerResponse(
  formType: string,
  swellContext: SwellServerContext,
  response: any,
) {
  const { theme } = swellContext;

  let result = response;

  if (theme.shopifyCompatibility) {
    const compatResponse =
      await theme.shopifyCompatibility.getAdaptedFormServerResponse(formType, {
        ...swellContext.context,
        response,
      });
    if (compatResponse !== undefined) {
      result = compatResponse;
    }
  }

  return result;
}

function getMiddlewareMatcher(
  urlParam: string | string[] | ((pathname: string) => boolean),
): (
  context: APIContext,
) => Partial<Record<string, string | string[]>> | boolean {
  if (typeof urlParam === 'function') {
    return (context: APIContext): boolean => {
      return urlParam(context.url.pathname);
    };
  }

  const urlParamArr = Array.isArray(urlParam) ? urlParam : [urlParam];

  try {
    const urlMatchers = urlParamArr.map((urlMatch) =>
      // Use minimatch for negation support
      urlMatch.includes('!')
        ? (url: string) => minimatch(url, urlMatch)
        : match(urlMatch),
    );

    return (
      context: APIContext,
    ): Partial<Record<string, string | string[]>> | boolean => {
      for (const matcher of urlMatchers) {
        const check = matcher(context.url.pathname);
        if (check) {
          if (typeof check === 'object' && check.params) {
            return check.params;
          }
          return true;
        }
      }
      return false;
    };
  } catch (err: unknown) {
    console.log(
      `Middleware URL match parameter invalid - ${JSON.stringify(urlParam)} - ${String(err)}`,
    );
    return () => false;
  }
}

export async function getFormParams(
  request: Request,
  searchParams: URLSearchParams,
): Promise<SwellData> {
  // First parse the query string and then form data
  const params: SwellData = qs.parse(searchParams.toString());

  const requestContentType = request.headers.get('Content-Type') || '';

  // Form data
  if (
    !request.parsedBody &&
    requestContentType.includes('multipart/form-data')
  ) {
    try {
      request.parsedBody = await request.formData();
    } catch {
      // noop
    }
  }

  // JSON data
  if (!request.parsedJson && requestContentType === 'application/json') {
    try {
      request.parsedJson = await request.json();
    } catch {
      // noop
    }
  }

  if (request.parsedBody) {
    // Use qs to parse because form may contain array[] properties
    let formData = '';
    for (const [key, value] of request.parsedBody.entries()) {
      formData += `&${key}=${value}`;
    }

    const formParams = qs.parse(formData.slice(1));
    for (const [key, value] of Object.entries(formParams)) {
      params[key] = value;
    }
  }

  if (request.parsedJson) {
    for (const [key, value] of Object.entries(request.parsedJson)) {
      params[key] = value;
    }
  }

  return params;
}

export function jsonResponse(
  values: SwellData,
  options?: ResponseInit,
): Response {
  return new Response(JSON.stringify(values), {
    status: 200,
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
}

export function restoreThemeRequestData(
  context: APIContext,
  theme: SwellTheme,
): void {
  const serializedFormData = getCookie(context, 'swell-form-data');

  if (serializedFormData) {
    try {
      const formData = JSON.parse(serializedFormData) as Record<
        string,
        unknown
      >;

      for (const [formId, data] of Object.entries(formData)) {
        theme.setFormData(formId, data as SwellData);
      }
    } catch (err) {
      console.log(err);
    }

    deleteCookie(context, 'swell-form-data');
  } else {
    const serializedGlobalData = getCookie(context, 'swell-global-data');

    if (serializedGlobalData) {
      try {
        const globalData = JSON.parse(serializedGlobalData) as SwellData;
        theme.setGlobals(globalData);
      } catch (err) {
        console.log(err);
      }
    }

    deleteCookie(context, 'swell-global-data');
  }
}

export async function preserveThemeRequestData(
  context: APIContext,
  theme: SwellTheme,
): Promise<void> {
  let serializedFormData = theme.serializeFormData();

  if (serializedFormData) {
    serializedFormData = await resolveAsyncResources(serializedFormData);

    if (!serializedFormData.preserved) {
      setCookie(
        context,
        'swell-form-data',
        JSON.stringify({ ...serializedFormData, preserved: true }),
      );
    }
  } else {
    let serializedGlobalData = theme.serializeGlobalData();

    if (serializedGlobalData) {
      serializedGlobalData = await resolveAsyncResources(serializedGlobalData);
      setCookie(
        context,
        'swell-global-data',
        JSON.stringify(serializedGlobalData),
      );
    }
  }
}

export function wrapSectionContent(
  theme: SwellTheme,
  sectionId: string,
  content: string,
): string {
  if (theme.shopifyCompatibility) {
    // TODO: figure out a way to use compatibility class for this
    return `<div id="shopify-section-${sectionId}" class="shopify-section">${content}</div>`;
  }

  return `<div id="swell-section-${sectionId}" class="swell-section">${content}</div>`;
}

// TODO: replace with util from storefrontjs
export async function resolveAsyncResources<T>(response: T): Promise<T> {
  if (response instanceof StorefrontResource) {
    return response.resolve() as T;
  }

  if (Array.isArray(response)) {
    return Promise.all(
      response.map((item: unknown) => {
        if (item instanceof StorefrontResource) {
          return item.resolve();
        }

        return item;
      }),
    ) as T;
  }

  if (typeof response === 'object' && response !== null) {
    const promises: Promise<unknown>[] = [];

    for (const [key, value] of Object.entries(response)) {
      if (value instanceof StorefrontResource) {
        promises.push(
          value.resolve().then((value) => {
            (response as Record<string, unknown>)[key] = value;
          }),
        );
      }
    }

    await Promise.all(promises);
  }

  return response;
}
