import { handleServerRequest } from '@/utils/server';

// TODO: move this to a middleware
export const POST = handleServerRequest(
  'cart/checkout',
  async (context: any) => {
    const { params, swell, theme, redirect } = context;
    const { updates } = params;

    const cart = theme.globals.cart;

    if (cart) {
      const cartItems = await cart.items;

      if (cartItems?.length > 0) {
        // Update cart quantity if any changed
        if (updates instanceof Array) {
          let promises = [];
          for (let i = 0; i < updates.length; i++) {
            const item = cartItems[i];
            if (item && item.quantity !== Number(updates[i])) {
              promises.push(
                swell.storefront.cart.updateItem(item.id, {
                  quantity: updates[i],
                }),
              );
            }
          }
          if (promises.length > 0) {
            await Promise.all(promises);
          }
        }

        if (cart.checkout_url) {
          return redirect(cart.checkout_url, 303);
        }
      }
    }

    // Fallback to cart page
    return redirect('/cart', 307);
  },
);
