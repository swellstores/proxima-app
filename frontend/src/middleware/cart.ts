import { cartCheckout } from '@/forms/cart';
import { handleMiddlewareRequest } from '@/utils/server';

export const submitCheckout = handleMiddlewareRequest(
  'POST',
  '/cart',
  cartCheckout,
);

export default [submitCheckout];
