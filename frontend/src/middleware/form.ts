import forms from '@/forms';
import {
  handleMiddlewareRequest,
  SwellServerContext,
  getShopifyCompatibleServerParams,
  getShopifyCompatibleServerResponse,
  FormRedirectResponse,
} from '@/utils/server';
import { restoreThemeRequestData as restoreHandler } from '@/utils/server';
import { ValidRedirectStatus } from 'astro';

export const formRoutes = forms.map((form) => {
  return handleMiddlewareRequest(
    'POST',
    form.url,
    async (context: SwellServerContext) => {
      const { theme, params, redirect } = context;

      if (form) {
        let compatParams = params;

        if (!theme.pageId) {
          await theme.initGlobals('index');
        }

        if (theme.shopifyCompatibility) {
          compatParams = await getShopifyCompatibleServerParams(
            form.id,
            context,
          );
          if (compatParams) {
            compatParams = {
              ...params,
              ...compatParams,
            };
          }
        }

        function formRedirectHandler(path: string, status?: ValidRedirectStatus, result?: object | null): FormRedirectResponse {
          // return json in editor mode
          if (compatParams.isEditor) {
            return {
              result,
              isEditor: true,
            };
          }

          // redirect
          return redirect(path, status);
        }

        let response = await form.handler({
          ...context,
          formRedirect: formRedirectHandler,
          params: compatParams,
        });

        if (theme.shopifyCompatibility) {
          response = await getShopifyCompatibleServerResponse(
            form.id,
            { ...context, params: compatParams },
            response,
          );
        }

        theme.setFormSuccessWithoutErrors(form.id);

        if (compatParams.return_to && response === undefined) {
          return redirect(compatParams.return_to, 303);
        }

        return response;
      }
    },
  );
});

export const restoreThemeRequestData = handleMiddlewareRequest(
  'GET',
  () => true,
  async (context: SwellServerContext) => {
    restoreHandler(context, context.theme);
  },
);
