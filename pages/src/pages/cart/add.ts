import { handleServerRequest } from '@/utils/server';

export const POST = handleServerRequest(
  'cart/add',
  async ({ params, swell, theme }: any) => {
    const { product_id, variant_id, options, quantity } = params;

    const result = await swell.storefront.cart.addItem({
      product_id,
      variant_id,
      options,
      quantity,
    });

    const cart = theme.fetchCart();

    // Make sure cart params are loaded
    await cart.items;

    // Pass $item_id in result for compatibility handler
    const cartResult = await cart._resolve();
    if (cartResult) {
      cartResult.$item_id = result.$item_id;
    }

    theme.setGlobals({ cart });

    return cart;
  },
);
