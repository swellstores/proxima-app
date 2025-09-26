import { cartGet, cartUpdate, cartCheckout } from '@/forms/cart';
import { handleMiddlewareRequest } from '@/utils/server';

const getCart = handleMiddlewareRequest('GET', ['/cart', '/cart.js'], cartGet);
const updateCart = handleMiddlewareRequest('GET', '/cart/change', cartUpdate);
const submitCheckout = handleMiddlewareRequest('POST', '/cart', cartCheckout);

export default [getCart, updateCart, submitCheckout];
