import pick from 'lodash/pick';
import { setInvalidResetKeyError } from '@/forms/account';
import { handleMiddlewareRequest, SwellServerContext } from '@/utils/server';

const doLogout = handleMiddlewareRequest(
  'GET',
  '/account/logout',
  async ({ swell, context }: SwellServerContext) => {
    await swell.storefront.account.logout();

    return context.redirect('/', 303);
  },
);

const ensureAccountLoggedIn = handleMiddlewareRequest(
  'GET',
  ['/account', '/account/!(login|signup|recover)'],
  async ({ swell, context }: SwellServerContext) => {
    const loggedIn = await swell.storefront.account.get();

    if (!loggedIn) {
      return context.redirect('/account/login', 303);
    }
  },
);

const validateAccountResetKey = handleMiddlewareRequest(
  'GET',
  '/account/recover{/:password_reset_key}?',
  async ({ swell, theme, params, context }: SwellServerContext) => {
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
      return context.redirect('/account/login', 303);
    }
  },
);

const deleteAddress = handleMiddlewareRequest(
  'POST',
  '/account/addresses/:delete_address_id',
  async ({ swell, params, context }: SwellServerContext) => {
    const { delete_address_id, _method } = params;

    const isDelete = _method === 'delete' || !_method;

    try {
      if (isDelete && delete_address_id) {
        await swell.storefront.account.deleteAddress(delete_address_id);
      }
    } catch (err) {
      console.log(err);
    }

    return context.redirect('/account/addresses', 303);
  },
);

const updateSubscription = handleMiddlewareRequest(
  'PUT',
  '/account/subscriptions/:id',
  async ({ swell, params, context }: SwellServerContext) => {
    const { id } = params;
    const update = pick(params, ['paused', 'date_pause_end', 'canceled']);

    try {
      await swell.storefront.subscriptions.update(id as string, update);
    } catch (err) {
      console.log(err);
    }

    return context.rewrite(
      new Request(new URL(`/account/subscriptions/${id}`, context.url.origin), {
        headers: {
          // Prevent response modification in the editor
          'Swell-Raw-Data': 'true',
        },
      }),
    );
  },
);

export default [
  doLogout,
  validateAccountResetKey,
  ensureAccountLoggedIn,
  deleteAddress,
  updateSubscription,
];
