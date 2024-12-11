import { APIContext, MiddlewareHandler, MiddlewareNext } from 'astro';
import {
  Swell,
  SwellTheme,
  StorefrontResource,
  dehydrateSwellRefsInStorefrontResources,
  SwellData,
} from '@swell/apps-sdk';
import {
  initSwell,
  initTheme,
  getCookie,
  setCookie,
  deleteCookie,
} from '@/swell';
import { minimatch } from 'minimatch';
import { match } from 'path-to-regexp';
import qs from 'qs';

export interface SwellServerContext extends APIContext {
  params: SwellData;
  swell: Swell;
  theme: SwellTheme;
  context: APIContext;
}

declare global {
  interface Request {
    parsedBody?: Record<string, any>;
    parsedJson?: Record<string, any>;
  }
}

export interface SwellServerNext extends MiddlewareNext {}

export function handleServerRequest(
  handler: (context: SwellServerContext) => string | object,
): (
  context: APIContext,
  contextHandler?: (context: any) => any,
) => Promise<Response | undefined> {
  return async (
    context: APIContext,
    contextHandler?: (context: any) => any,
  ) => {
    const serverContext = await initServerContext(context);

    try {
      const result = await handler(serverContext);

      if (result === undefined) {
        return result;
      }

      if (result instanceof Response) {
        ensureSwellSessionCookieSet(context, result);
        return result;
      }

      if (contextHandler) {
        contextHandler(serverContext);
      }

      return sendServerResponse(result, serverContext);
    } catch (err: any) {
      return sendServerError(err);
    }
  };
}

export function handleMiddlewareRequest(
  method: string,
  urlParam: string | string[] | Function,
  handler: (context: SwellServerContext, next: SwellServerNext) => any,
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

    const serverContext = await initServerContext(context);

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
        ensureSwellSessionCookieSet(context, result);
        await preserveThemeRequestData(context, theme);
        return result;
      }

      if (result === undefined) {
        return next();
      }

      return sendServerResponse(result, serverContext);
    } catch (err: any) {
      return sendServerError(err);
    }
  };
}

function ensureSwellSessionCookieSet(context: APIContext, response: Response) {
  // IMPORTANT NOTE:
  // Astro does not support setting multiple cookies in the same response
  // Until a fix is made, we ensure the swell session cookie always takes precedence
  const setCookies = Array.from(context.cookies.headers());
  const swellSessionCookie = setCookies.find((cookie) =>
    cookie.startsWith('swell-session='),
  );
  if (swellSessionCookie) {
    response.headers.set('Set-Cookie', swellSessionCookie);
  }
}

export async function initServerContext(
  context: APIContext,
): Promise<SwellServerContext> {
  const swell = context.locals.swell || await initSwell(context);
  context.locals.swell = swell;

  const theme = context.locals.theme || initTheme(swell);
  context.locals.theme = theme;

  const params = await getFormParams(context.request, context.url.searchParams);

  return {
    ...context,
    params,
    swell,
    theme,
    context,
  };
}

export async function sendServerResponse(
  result: any,
  context: SwellServerContext,
): Promise<Response> {
  const { theme, params } = context;

  let response: any;

  if (theme.shopifyCompatibility) {
    theme.setCompatibilityData(result);
  }

  response = await resolveAsyncResources(result);

  dehydrateSwellRefsInStorefrontResources(response);

  if (typeof response === 'string') {
    response = {
      response,
    };
  } else if (!response) {
    response = {};
  }

  if (params.sections) {
    const sectionsRendered = await theme.renderAllSections(params.sections);
    if (sectionsRendered) {
      response.sections = sectionsRendered;
    }
  } else {
    const sectionId = context.url.searchParams.get('section_id');
    if (sectionId) {
      const sectionRendered = await theme.renderSection(sectionId, response);
      return new Response(
        wrapSectionContent(theme, sectionId, sectionRendered as string),
      );
    }
  }

  return jsonResponse(response);
}

export function sendServerError(err: any) {
  if (!err.code) {
    console.error(err);
  }
  return jsonResponse(
    {
      message: 'Something went wrong',
      description: err.code ? err.message : 'Internal server error',
      errors: err.code && {
        [err.code]: err.message,
      },
      status: err.status || 500,
    },
    {
      status: err.status || 500,
    },
  );
}

export async function getShopifyCompatibleServerParams(
  formType: string,
  context: SwellServerContext,
) {
  const { theme, params } = context;

  let result = params;

  if (theme.shopifyCompatibility) {
    const compatParams =
      await theme.shopifyCompatibility.getAdaptedFormServerParams(
        formType,
        context,
      );
    if (compatParams !== undefined) {
      result = compatParams;
    }
  }

  return result;
}

export async function getShopifyCompatibleServerResponse(
  formType: string,
  context: SwellServerContext,
  response: any,
) {
  const { theme } = context;

  let result = response;

  if (theme.shopifyCompatibility) {
    const compatResponse =
      await theme.shopifyCompatibility.getAdaptedFormServerResponse(formType, {
        ...context,
        response,
      });
    if (compatResponse !== undefined) {
      result = compatResponse;
    }
  }

  return result;
}

function getMiddlewareMatcher(urlParam: string | string[] | Function) {
  if (typeof urlParam === 'function') {
    return (context: APIContext) => {
      return urlParam(context.url.pathname);
    };
  }

  const urlParamArr = urlParam instanceof Array ? urlParam : [urlParam];

  try {
    const urlMatchers = urlParamArr.map((urlMatch) =>
      // Use minimatch for negation support
      urlMatch.includes('!')
        ? (url: string) => minimatch(url, urlMatch)
        : match(urlMatch),
    );

    return (context: APIContext) => {
      for (let i = 0; i < urlMatchers.length; i++) {
        const check = urlMatchers[i](context.url.pathname) as any;
        if (check) {
          if (check.params) {
            return check.params;
          }
          return true;
        }
      }
      return false;
    };
  } catch (err: any) {
    console.log(
      `Middleware URL match parameter invalid - ${JSON.stringify(urlParam)} - ${err.toString()}`,
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

  // Form data
  if (!request.parsedBody) {
    try {
      request.parsedBody = await request.formData();
    } catch {
      // noop
    }
  }

  // JSON data
  if (!request.parsedJson) {
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
      formData += `${key}=${value}&`;
    }

    const formParams = qs.parse(formData);
    for (const key in formParams) {
      params[key] = formParams[key];
    }
  }

  if (request.parsedJson) {
    for (const key in request.parsedJson) {
      params[key] = request.parsedJson[key];
    }
  }

  return params;
}

export function jsonResponse(values: SwellData, options?: ResponseInit) {
  return new Response(JSON.stringify(values), {
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
) {
  const serializedFormData = getCookie(context, 'swell-form-data');
  if (serializedFormData) {
    try {
      const formData = JSON.parse(serializedFormData);
      for (const [formId, data] of Object.entries(formData)) {
        theme.setFormData(formId, data as unknown as SwellData);
      }
    } catch (err) {
      console.log(err);
    }
    deleteCookie(context, 'swell-form-data');
  } else {
    const serializedGlobalData = getCookie(context, 'swell-global-data');
    if (serializedGlobalData) {
      try {
        const globalData = JSON.parse(serializedGlobalData);
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
) {
  let serializedFormData = theme.serializeFormData();
  if (serializedFormData) {
    serializedFormData = await resolveAsyncResources(serializedFormData);
    setCookie(context, 'swell-form-data', JSON.stringify(serializedFormData));
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

function wrapSectionContent(
  theme: SwellTheme,
  sectionId: string,
  content: string,
) {
  if (theme.shopifyCompatibility) {
    // TODO: figure out a way to use compatibility class for this
    return `
        <div id="shopify-section-${sectionId}" class="shopify-section">${content}</div>
      `.trim();
  } else {
    return `
        <div id="swell-section-${sectionId}" class="swell-section">${content}</div>
      `.trim();
  }
}

// TODO: replace with util from storefrontjs
export async function resolveAsyncResources(response: any) {
  if (response instanceof StorefrontResource) {
    return await response.resolve();
  }

  if (response instanceof Array) {
    return await Promise.all(
      response.map(async (item: any) => {
        if (item instanceof StorefrontResource) {
          return await item.resolve();
        }
        return item;
      }),
    );
  } else if (typeof response === 'object' && response !== null) {
    for (const [key] of Object.entries(response)) {
      if (response[key] instanceof StorefrontResource) {
        response[key] = await response[key].resolve();
      }
    }
  }

  return response;
}
