import { setInvalidResetKeyError } from '@/forms/account';
import { handleMiddlewareRequest, SwellServerContext } from '@/utils/server';

export const doLogout = handleMiddlewareRequest(
  'GET',
  '/account/logout',
  async ({ swell, redirect }: SwellServerContext) => {
    await swell.storefront.account.logout();

    return redirect('/', 303);
  },
);

export const ensureAccountLoggedIn = handleMiddlewareRequest(
  'GET',
  ['/account', '/account/!(login|signup|recover)'],
  async ({ swell, redirect }: SwellServerContext) => {
    const loggedIn = await swell.storefront.account.get();

    if (!loggedIn) {
      return redirect('/account/login', 303);
    }
  },
);

export const validateAccountResetKey = handleMiddlewareRequest(
  'GET',
  '/account/recover{/:password_reset_key}?',
  async ({ swell, theme, params, redirect }: SwellServerContext) => {
    const { password_reset_key } = params;

    if (password_reset_key) {
      theme.setGlobals({ password_reset_key });

      try {
        const account = await swell.get('/accounts/:last', {
          password_reset_key,
        });

        if (!account) {
          await setInvalidResetKeyError(theme);
        }
      } catch (err) {
        console.log(err);
      }
    } else {
      return redirect('/account/login', 303);
    }
  },
);

export const deleteAddress = handleMiddlewareRequest(
  'POST',
  '/account/addresses/:delete_address_id',
  async ({ swell, params, redirect }: SwellServerContext) => {
    const { delete_address_id, _method } = params;

    const isDelete = _method === 'delete' || !_method;

    try {
      if (isDelete && delete_address_id) {
        await swell.storefront.account.deleteAddress(delete_address_id);
      }
    } catch (err) {
      console.log(err);
    }

    return redirect('/account/addresses', 303);
  },
);

export default [
  doLogout,
  validateAccountResetKey,
  ensureAccountLoggedIn,
  deleteAddress,
];
