import { cartCheckout } from '@/forms/cart';
import { FormRedirectResponse, handleMiddlewareRequest, SwellServerContext } from '@/utils/server';
import { ValidRedirectStatus } from 'astro';

export const submitCheckout = handleMiddlewareRequest(
  'POST',
  '/cart',
  async (context: SwellServerContext) => {
    function formRedirectHandler(path: string, status?: ValidRedirectStatus, _result?: object | null): FormRedirectResponse {
      return context.redirect(path, status);
    }
            
    cartCheckout({
      ...context,
      redirect: formRedirectHandler,
    });
  },
);

export default [submitCheckout];
