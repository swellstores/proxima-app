import { SwellTheme, SwellData } from '@swell/apps-sdk';

import type { SwellServerContext } from '@/utils/server';
import { APIContext } from 'astro';

function redirectToUrl(context: APIContext, url: string) {
  const { redirect, request } = context;
  if (request.headers.get('HX-REQUEST')) {
    // provide HX-Redirect header to force redirection
    return new Response(null, {
      status: 200,
      statusText: 'Success',
      headers: {
        'HX-Redirect': url,
      },
    });
  }

  return redirect(url, 303);
}

export async function accountLogin(swellContext: SwellServerContext) {
  const {
    params: { account },
    swell,
    theme,
    context,
  } = swellContext;
  const { redirect } = context;
  const { email, password } = account || {};

  const result = await swell.storefront.account.login(email, password);

  if (result) {
    return redirectToUrl(context, '/account');
  }

  await setLoginError(theme);
  return redirect('/account/login', 303);
}

export async function accountCreate({
  swell,
  theme,
  params,
  context,
}: SwellServerContext) {
  const { redirect } = context;
  const { account } = params;

  try {
    const result = await swell.storefront.account.create(account);
    if (result && 'errors' in result) {
      await setCreateAccountErrors(theme, result.errors);
      return redirect('/account/signup', 303);
    }
  } catch (err) {
    // handle special errors
    const isMustLogoutError =
      err.message === 'You must be logged out to create an account';
    const code = isMustLogoutError ? 'logout_error' : 'unknown_error';
    const error_text = isMustLogoutError
      ? await theme.lang(
          'sections.register.logout_error',
          null,
          'You must be logged out to create an account',
        )
      : await theme.lang(
          'sections.register.unknown_error',
          null,
          'Cannot create account',
        );

    await setCreateAccountErrors(theme, { email: { code } }, code, error_text);

    return redirect('/account/signup', 303);
  }

  return redirectToUrl(context, '/account');
}

export async function accountSubscribe({
  swell,
  theme,
  params,
}: SwellServerContext) {
  const { account } = params;

  try {
    const loggedIn = await swell.storefront.account.get();

    if (loggedIn) {
      // Ignore email if already logged in
      await swell.storefront.account.update({
        email: undefined,
        ...account,
      });
    } else {
      const result = await swell.storefront.account.create(account);
      if (result && 'errors' in result) {
        await setSubscribeAccountErrors(theme, result.errors);
      }
    }
  } catch (err) {
    console.log(err);
  }
}

export async function accountPasswordRecover({
  swell,
  theme,
  params,
  context,
}: SwellServerContext) {
  const { redirect } = context;
  const { email, password_reset_key, reset_key } = params;

  if (password_reset_key || reset_key || !email) {
    return accountPasswordReset(arguments[0]);
  }

  // Send recovery email
  try {
    const resetUrl = `${context.request.headers.get('origin')}/account/recover/{password_reset_key}`;
    await swell.storefront.account.recover({
      email,
      password_reset_url: resetUrl,
    });

    theme.setGlobalData({ recover_success: true });
  } catch (err) {
    console.log(err);
  }

  return redirect('/account/login#recover', 303);
}

export async function accountPasswordReset({
  swell,
  theme,
  params,
  context,
}: SwellServerContext) {
  const { redirect } = context;
  const { password_reset_key, reset_key, password, password_confirmation } =
    params;
  const key = password_reset_key || reset_key;

  // missed key
  if (!key) {
    await setInvalidResetKeyError(theme);
    return redirect(`/account/recover/error`, 303);
  }

  // Submit new password
  try {
    // password !== confirmation
    if (
      password_confirmation !== undefined &&
      password !== password_confirmation
    ) {
      await setInvalidPasswordResetConfirmationError(theme);
      return redirect(`/account/recover/${key}`, 303);
    }

    // try recover password
    const result = await swell.storefront.account.recover({
      password_reset_key: key,
      password,
    });

    // success
    if (result && !('errors' in result)) {
      await swell.storefront.account.login(result.email as string, password);
      return redirectToUrl(context, '/account');
    }

    // error
    return redirect(`/account/recover/${key}`, 303);
  } catch (err: any) {
    console.log(err);
    if (err.message.includes('password_reset_key')) {
      await setInvalidResetKeyError(theme);
    } else {
      await setInvalidPasswordResetError(theme);
    }
    return redirect(`/account/recover${key ? `/${key}` : '/error'}`, 303);
  }
}

export async function accountAddressCreateUpdate({
  params,
  swell,
  context,
}: SwellServerContext) {
  const { redirect } = context;
  const {
    update_address_id,
    delete_address_id,
    return_to,
    address,
    is_default,
  } = params;

  try {
    if (delete_address_id) {
      await swell.storefront.account.deleteAddress(delete_address_id);
    } else {
      let result;
      if (update_address_id) {
        result = await swell.storefront.account.updateAddress(
          update_address_id,
          address,
        );
      } else {
        result = await swell.storefront.account.createAddress(address);
      }
      if (result && 'errors' in result) {
        console.log(result.errors);
      } else if (is_default) {
        await swell.storefront.account.update({
          shipping: { account_address_id: result.id },
        });
      }
    }
  } catch (err) {
    console.log(err);
  }

  return redirect(return_to || '/account/addresses', 303);
}

export async function accountSubscriptionUpdate({
  params,
  swell,
  context,
}: SwellServerContext) {
  const { id, date_pause_end, paused, canceled, return_to } = params;
  const update = {
    date_pause_end: toDate(date_pause_end)?.toISOString(),
    paused: toBoolean(paused),
    canceled: toBoolean(canceled),
  };

  if (update.date_pause_end) {
    update.paused = true;
  }

  try {
    await swell.storefront.subscriptions.update(id as string, update);
  } catch (err) {
    console.log(err);
  }

  return context.redirect(return_to || `/account/subscriptions/${id}`, 303);
}

function toDate(value: unknown): Date | undefined {
  if (typeof value !== 'string') {
    return;
  }

  const timestamp = Date.parse(value);

  if (isNaN(timestamp)) {
    return;
  }

  return new Date(timestamp);
}

function toBoolean(value: unknown): boolean | undefined {
  if (typeof value !== 'string') {
    return;
  }

  switch (value.toLowerCase()) {
    case 'true':
      return true;
    case 'false':
      return false;
    default:
      return;
  }
}

async function setLoginError(theme: SwellTheme) {
  theme.setFormData('account_login', {
    errors: [
      {
        code: 'invalid_credentials',
        field_name: 'email',
        field_label: await theme.lang('sections.login.email', null, 'Email'),
        message: await theme.lang(
          'sections.login.invalid_credentials',
          null,
          'Invalid email or password.',
        ),
      },
    ],
  });
}

export async function setInvalidResetKeyError(theme: SwellTheme) {
  theme.setFormData('account_password_reset', {
    errors: [
      {
        code: 'invalid_reset_key',
        field_name: 'password_reset_key',
        message: await theme.lang(
          'sections.reset-password.invalid_reset_key',
          null,
          'Invalid account recovery key',
        ),
      },
    ],
  });
}

async function setInvalidPasswordResetError(theme: SwellTheme) {
  theme.setFormData('account_password_reset', {
    errors: [
      {
        code: 'invalid_password_reset',
        field_name: 'password',
        message: await theme.lang(
          'sections.reset-password.invalid_password_reset',
          null,
          'Invalid password',
        ),
      },
    ],
  });
}

async function setInvalidPasswordResetConfirmationError(theme: SwellTheme) {
  theme.setFormData('account_password_reset', {
    errors: [
      {
        code: 'invalid_password_confirmation',
        field_name: 'password_confirmation',
        message: await theme.lang(
          'sections.reset-password.invalid_password_confirmation',
          null,
          'Password confirmation must match the provided password',
        ),
      },
    ],
  });
}

async function setCreateAccountErrors(
  theme: SwellTheme,
  errors: SwellData,
  code: string = '',
  message: string = '',
) {
  if (!errors.email && !errors.password) {
    return;
  }
  theme.setFormData('account_create', {
    errors: [
      ...(errors.email
        ? [
            {
              code: code || 'invalid_email',
              field_name: 'customer[email]',
              field_label: await theme.lang(
                'sections.register.email',
                null,
                'Email',
              ),
              message:
                message ||
                (await theme.lang(
                  'sections.register.invalid_email_error',
                  null,
                  'Invalid email address',
                )),
            },
          ]
        : []),
      ...(errors.password
        ? [
            {
              code: 'invalid_password',
              field_name: 'customer[password]',
              field_label: await theme.lang(
                'sections.register.password',
                null,
                'Password',
              ),
              message: await theme.lang(
                'sections.register.invalid_password_error',
                null,
                'Invalid password',
              ),
            },
          ]
        : []),
    ],
  });
}

async function setSubscribeAccountErrors(theme: SwellTheme, errors: SwellData) {
  if (!errors.email || errors.email.code === 'UNIQUE') {
    // Ignore duplicate email error while subscribing
    return;
  }
  theme.setFormData('account_subscribe', {
    errors: [
      {
        code: 'invalid_email',
        field_name: 'email',
        field_label: await theme.lang(
          'forms.account_signup.email',
          null,
          'Email',
        ),
        message: await theme.lang(
          'forms.account_signup.invalid_email',
          null,
          'Invalid email address',
        ),
      },
    ],
  });
}

export default [
  {
    id: 'account_login',
    url: '/account/login',
    handler: accountLogin,
  },
  {
    id: 'account_create',
    url: '/account',
    handler: accountCreate,
  },
  {
    id: 'account_create',
    url: '/account/signup',
    handler: accountCreate,
  },
  {
    id: 'account_subscribe',
    url: '/account/subscribe',
    handler: accountSubscribe,
  },
  {
    id: 'account_password_recover',
    url: '/account/recover',
    handler: accountPasswordRecover,
    params: [
      {
        name: 'password_reset_key',
        value: '{{ value }}',
      },
    ],
  },
  {
    id: 'account_password_reset',
    url: '/account/recover',
    handler: accountPasswordReset,
  },
  {
    id: 'account_address',
    url: '/account/addresses',
    handler: accountAddressCreateUpdate,
    params: [
      {
        name: 'update_address_id',
        value: '{{ value.id }}',
      },
      {
        name: 'delete_address_id',
        value: '{{ value.id }}',
      },
    ],
  },
  {
    id: 'account_subscription',
    url: '/account/subscription_update',
    handler: accountSubscriptionUpdate,
    params: [
      {
        name: 'id',
        value: '{{ value.id }}',
      },
    ],
  },
];
