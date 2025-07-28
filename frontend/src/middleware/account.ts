import { setInvalidResetKeyError } from '@/forms/account';
import {
  handleMiddlewareRequest,
  jsonResponse,
  SwellServerContext,
} from '@/utils/server';

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

const pauseSubscription = handleMiddlewareRequest(
  'POST',
  '/subscriptions/pause',
  async ({ swell, params, context }: SwellServerContext) => {
    const { id, date_pause_end } = params;

    try {
      await swell.storefront.subscriptions.update(id as string, {
        paused: true,
        date_pause_end: (date_pause_end as string) || null,
      });
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

const resumeSubscription = handleMiddlewareRequest(
  'POST',
  '/subscriptions/resume',
  async ({ swell, params, context }: SwellServerContext) => {
    const { id } = params;

    try {
      await swell.storefront.subscriptions.update(id as string, {
        paused: false,
        date_pause_end: null,
      });
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

const cancelSubscription = handleMiddlewareRequest(
  'POST',
  '/subscriptions/cancel',
  async ({ swell, params, context }: SwellServerContext) => {
    const { id } = params;

    try {
      await swell.storefront.subscriptions.update(id as string, {
        canceled: true,
      });
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
  pauseSubscription,
  resumeSubscription,
  cancelSubscription,
];
