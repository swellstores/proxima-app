import { APIContext, MiddlewareHandler } from 'astro';
import {
  SwellTheme,
  StorefrontResource,
  // removeCircularReferences,
  dehydrateSwellRefsInStorefrontResources,
} from '@swell/storefrontjs';
import { initSwell, getCookie, setCookie, deleteCookie } from '@/swell';
import storefrontConfig from '../../storefront.json';
import StorefrontShopifyCompatibility from '@/resources/shopify-compatibility';
import qs from 'qs';

// TODO: replace this with handleMiddlewareRequest
export function handleServerRequest(
  pageId: string,
  handler: (context: any) => string | object,
): (
  context: APIContext,
  contextHandler?: (context: any) => any,
) => Promise<Response | undefined> {
  return async (
    context: APIContext,
    contextHandler?: (context: any) => any,
  ) => {
    const swell = context.locals.swell || initSwell(context);

    const theme =
      context.locals.theme ||
      new SwellTheme(swell, {
        storefrontConfig,
        shopifyCompatibilityClass: StorefrontShopifyCompatibility,
      });

    await theme.initGlobals({ pageId, url: context.url });

    let params = await getFormParams(context.request, context.url.searchParams);

    try {
      let response: any;

      if (theme.shopifyCompatibility) {
        const compatParams =
          await theme.shopifyCompatibility.getAdaptedFormServerParams(
            pageId,
            params.form_type,
            {
              ...context,
              params,
              swell,
              theme,
            },
          );
        if (compatParams !== undefined) {
          params = compatParams;
        }
      }

      const result = await handler({
        ...context,
        params,
        swell,
        theme,
        context,
        redirect: context.redirect,
      });

      if (contextHandler) {
        contextHandler({
          ...context,
          params,
          swell,
          theme,
        });
      }

      if (result instanceof Response || result === undefined) {
        return result;
      }

      if (theme.shopifyCompatibility) {
        theme.setCompatibilityData(result);
      }

      response = await resolveAsyncResources(result);

      dehydrateSwellRefsInStorefrontResources(response);

      if (theme.shopifyCompatibility) {
        const compatResponse =
          await theme.shopifyCompatibility.getAdaptedFormServerResponse(
            pageId,
            params.form_type,
            {
              ...context,
              response,
              params,
              swell,
              theme,
            },
          );
        if (compatResponse !== undefined) {
          response = compatResponse;
        }
      }

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
          const sectionRendered = await theme.renderSection(
            sectionId,
            response,
          );
          return new Response(
            wrapSectionContent(theme, sectionId, sectionRendered),
          );
        }
      }

      return jsonResponse(response);
    } catch (err: any) {
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
  };
}

export type MiddlewareAPIContext = APIContext & {
  params: SwellData;
  swell: Swell;
  theme?: SwellTheme;
  context?: APIContext;
};

export function handleMiddlewareRequest(
  method: string,
  urlMatch: string | Function,
  handler: (context: MiddlewareAPIContext) => any,
  pageId?: string,
): MiddlewareHandler {
  return async (context, next) => {
    if (method !== context.request.method) {
      return next();
    }
    if (!matchMiddlewareUrlPath(urlMatch, context)) {
      return next();
    }

    const swell = context.locals.swell || initSwell(context);
    context.locals.swell = swell;

    const theme =
      context.locals.theme ||
      new SwellTheme(swell, {
        storefrontConfig,
        shopifyCompatibilityClass: StorefrontShopifyCompatibility,
      });
    context.locals.theme = theme;

    if (pageId) {
      await theme.initGlobals({ pageId, url: context.url });
    }

    let params = await getFormParams(context.request, context.url.searchParams);

    try {
      let response: any;

      if (theme.shopifyCompatibility) {
        const compatParams =
          await theme.shopifyCompatibility.getAdaptedFormServerParams(
            pageId,
            params.form_type,
            {
              ...context,
              params,
              swell,
              theme,
            },
          );
        if (compatParams !== undefined) {
          params = compatParams;
        }
      }

      const result = await handler({
        ...context,
        params,
        swell,
        theme,
        context,
      });

      if (result instanceof Response) {
        await preserveThemeRequestData(context, theme);
        return result;
      }

      if (result === undefined) {
        return next();
      }

      if (theme.shopifyCompatibility) {
        theme.setCompatibilityData(result);
      }

      response = await resolveAsyncResources(result);

      dehydrateSwellRefsInStorefrontResources(response);

      if (theme.shopifyCompatibility) {
        const compatResponse =
          await theme.shopifyCompatibility.getAdaptedFormServerResponse(
            pageId,
            params.form_type,
            {
              ...context,
              response,
              params,
              swell,
              theme,
            },
          );
        if (compatResponse !== undefined) {
          response = compatResponse;
        }
      }

      if (typeof response === 'string') {
        response = {
          response,
        };
      } else if (!response) {
        response = {};
      }

      if (theme) {
        if (params.sections) {
          const sectionsRendered = await theme.renderAllSections(
            params.sections,
          );
          if (sectionsRendered) {
            response.sections = sectionsRendered;
          }
        } else {
          const sectionId = context.url.searchParams.get('section_id');
          if (sectionId) {
            const sectionRendered = await theme.renderSection(
              sectionId,
              response,
            );
            return new Response(
              wrapSectionContent(theme, sectionId, sectionRendered),
            );
          }
        }
      }

      return jsonResponse(response);
    } catch (err: any) {
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
  };
}

function matchMiddlewareUrlPath(
  urlMatch: string | Function,
  context: APIContext,
) {
  const { url } = context;

  if (typeof urlMatch === 'string') {
    if (url.pathname === urlMatch) {
      return true;
    }
  } else if (typeof urlMatch === 'function') {
    if (urlMatch(url.pathname)) {
      return true;
    }
  }

  return false;
}

export async function getFormParams(
  request: Request,
  searchParams: URLSearchParams,
): Promise<SwellData> {
  // First parse the query string and then form data
  const params: SwellData = qs.parse(searchParams.toString());

  // Form data
  try {
    // Use qs to parse because form may contain array[] properties
    let formData = '';
    const body = await request.formData();
    for (const [key, value] of body.entries()) {
      formData += `${key}=${value}&`;
    }
    const formParams = qs.parse(formData);
    for (const key in formParams) {
      params[key] = formParams[key];
    }
  } catch {
    // noop
  }

  // JSON data
  try {
    const body = await request.json();
    for (const key in body) {
      params[key] = body[key];
    }
  } catch {
    // noop
  }

  return params;
}

export function jsonResponse(values: SwellData, options?: ResponseInit) {
  return new Response(JSON.stringify(values), options);
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
        theme.setFormData(formId, data);
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
