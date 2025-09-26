import { handleMiddlewareRequest, SwellServerContext } from '@/utils/server';

const redirectToCheckout = handleMiddlewareRequest(
  'GET',
  '/checkout',
  async (swellContext: SwellServerContext) => {
    const { theme, context } = swellContext;
    const { redirect } = context;
    const cart = await theme.fetchCart();

    return cart?.checkout_url
      ? redirect(cart.checkout_url, 303)
      : redirect('/cart', 303);
  },
);

export default [redirectToCheckout];
