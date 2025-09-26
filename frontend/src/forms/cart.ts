import {
  SwellServerNext,
  SwellServerContext,
  getShopifyCompatibleServerParams,
  getShopifyCompatibleServerResponse,
} from '@/utils/server';

export async function cartGet(
  context: SwellServerContext,
  next: SwellServerNext,
) {
  const {
    theme,
    context: { request },
  } = context;

  // Skip handler if something else is expected instead of json
  if (!(request.headers.get('accept') ?? '').startsWith('application/json')) {
    await next();
    return;
  }

  const cart = await theme.fetchCart();

  // Make sure cart items are loaded
  await cart.items;

  theme.setGlobals({ cart });

  return cart;
}

export async function cartAdd(context: SwellServerContext) {
  const { params, swell, theme } = context;
  const { product_id, variant_id, options, quantity, purchase_option } = params;

  await swell.storefront.cart.addItem({
    product_id,
    variant_id,
    options,
    quantity,
    purchase_option,
  });

  const cart = await theme.fetchCart();

  // Make sure cart items are loaded
  await cart.items;

  theme.setGlobals({ cart });

  return getShopifyCompatibleServerResponse('cart_add', context, cart);
}

export async function cartUpdate(swellContext: SwellServerContext) {
  const { swell, theme, context } = swellContext;
  const { redirect } = context;

  // Manually handle cart_update compatibility
  // because there is no equivalent form for it in Shopify
  const { item_id, quantity } = await getShopifyCompatibleServerParams(
    'cart_update',
    swellContext,
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

    // Make sure cart is loaded
    await cart.resolve();

    theme.setGlobals({ cart });

    response = cart;
  } else {
    response = theme.globals.cart;
  }

  // Fallback to cart page
  if (context.request.method === 'GET') {
    return redirect('/cart', 303);
  }

  return getShopifyCompatibleServerResponse(
    'cart_update',
    swellContext,
    response,
  );
}

export async function cartCheckout(swellContext: SwellServerContext) {
  const { params, swell, theme, context } = swellContext;
  const { redirect } = context;
  const { updates, checkout } = params;

  const cart = theme.globals.cart;

  if (cart) {
    const cartItems = await cart.items;

    if (cartItems?.length > 0) {
      // Update cart quantity if any changed
      if (Array.isArray(updates)) {
        const promises = [];
        for (let i = 0; i < updates.length; ++i) {
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

      if (checkout !== undefined && cart.checkout_url) {
        return redirect(cart.checkout_url, 303);
      }
    }
  }

  // Fallback to cart page
  return redirect('/cart', 303);
}

export default [
  {
    id: 'cart_add',
    url: ['/cart/add', '/cart/add.js'],
    handler: cartAdd,
  },
  {
    id: 'cart_update',
    url: ['/cart/update', '/cart/update.js'],
    handler: cartUpdate,
  },
  {
    id: 'cart_checkout',
    url: '/cart/checkout',
    handler: cartCheckout,
  },
];
