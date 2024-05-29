import { handleServerRequest } from '@/utils/server';

export const POST = handleServerRequest(
  'cart/add',
  async ({ params, swell, theme }: any) => {
    const { product_id, variant_id, options, quantity } = params;

    await swell.storefront.cart.addItem({
      product_id,
      variant_id,
      options,
      quantity,
    });

    const cart = theme.fetchCart();

    // Make sure cart items are loaded
    await cart.items;

    theme.setGlobals({ cart });

    return cart;
  },
);
