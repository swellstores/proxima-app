import {
  SwellServerContext,
  getShopifyCompatibleServerParams,
  getShopifyCompatibleServerResponse,
} from '@/utils/server';

export async function cartAdd({ params, swell, theme }: SwellServerContext) {
  const { product_id, variant_id, options, quantity } = params;

  await swell.storefront.cart.addItem({
    product_id,
    variant_id,
    options,
    quantity,
  });

  const cart = await theme.fetchCart();

  // Make sure cart items are loaded
  await cart.items;

  theme.setGlobals({ cart });

  return cart;
}

export async function cartUpdate(context: SwellServerContext) {
  const { swell, theme } = context;

  // Manually handle cart_update compatibility
  // because there is no equivalent form for it in Shopify
  const { item_id, quantity } = await getShopifyCompatibleServerParams(
    'cart_update',
    context,
  );

  let response;

  if (item_id) {
    if (quantity === 0) {
      await swell.storefront.cart.removeItem(item_id);
    } else {
      await swell.storefront.cart.updateItem(item_id, {
        quantity,
      });
    }

    const cart = await theme.fetchCart();

    // Make sure cart items are loaded
    await cart.items;

    theme.setGlobals({ cart });

    response = cart;
  } else {
    response = theme.globals.cart;
  }

  return getShopifyCompatibleServerResponse('cart_update', context, response);
}

export async function cartCheckout(context: SwellServerContext) {
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
}

export default [
  {
    id: 'cart_add',
    url: '/cart/add',
    handler: cartAdd,
  },
  {
    id: 'cart_update',
    url: '/cart/update',
    handler: cartUpdate,
  },
  {
    id: 'cart_checkout',
    url: '/cart/checkout',
    handler: cartCheckout,
  },
];
