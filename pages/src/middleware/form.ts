import { handleMiddlewareRequest } from '@/utils/server';
import { restoreThemeRequestData as restoreHandler } from '@/utils/server';

export const restoreThemeRequestData = handleMiddlewareRequest(
  'GET',
  () => true,
  async (context: any) => {
    restoreHandler(context, context.theme);
  },
);
