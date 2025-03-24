import { cartGet, cartCheckout } from '@/forms/cart';
import { handleMiddlewareRequest } from '@/utils/server';

const getCart = handleMiddlewareRequest('GET', '/cart', cartGet);
const submitCheckout = handleMiddlewareRequest('POST', '/cart', cartCheckout);

export default [getCart, submitCheckout];
