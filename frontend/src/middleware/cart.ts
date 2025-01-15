import { cartCheckout } from '@/forms/cart';
import { handleMiddlewareRequest, SwellServerContext } from '@/utils/server';

export const submitCheckout = handleMiddlewareRequest(
  'POST',
  '/cart',
  async (context: SwellServerContext) => {
    cartCheckout({
      ...context,
      formRedirect: context.redirect,
    });
  },
);

export default [submitCheckout];
