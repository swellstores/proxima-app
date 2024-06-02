import { handleServerRequest } from '@/utils/server';

// TODO: move this to a middleware
export const POST = handleServerRequest(
  'cart/change',
  async ({ params, swell, theme }: any) => {
    const { item_id, quantity } = params;

    if (item_id) {
      if (quantity === 0) {
        await swell.storefront.cart.removeItem(item_id);
      } else {
        await swell.storefront.cart.updateItem(item_id, {
          quantity,
        });
      }

      const cart = theme.fetchCart();

      // Make sure cart items are loaded
      await cart.items;

      theme.setGlobals({ cart });

      return cart;
    }

    return theme.globals.cart;
  },
);
