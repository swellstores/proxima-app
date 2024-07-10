import forms from '@/forms';
import {
  handleMiddlewareRequest,
  SwellServerContext,
  getShopifyCompatibleServerParams,
  getShopifyCompatibleServerResponse,
} from '@/utils/server';
import { restoreThemeRequestData as restoreHandler } from '@/utils/server';

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

        let response = await form.handler({
          ...context,
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
