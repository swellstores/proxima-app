import { SwellTheme, SwellData } from '@swell/apps-sdk';

import type { SwellServerContext } from '@/utils/server';

export async function accountLogin(context: SwellServerContext) {
  const {
    params: { account, isEditor },
    swell,
    theme,
    redirect,
  } = context;
  const { email, password } = account || {};

  const result = await swell.storefront.account.login(email, password);
  if (isEditor) {
    return result;
  }

  if (result) {
    return redirect('/account', 303);
  }

  await setLoginError(theme);
  return redirect('/account/login', 303);
}

export async function accountCreate({
  swell,
  theme,
  params,
  redirect,
}: SwellServerContext) {
  const { account, isEditor } = params;

  try {
    const result = await swell.storefront.account.create(account);
    if (isEditor) {
      return result;
    }
    if (result && 'errors' in result) {
      await setCreateAccountErrors(theme, result.errors);
      return redirect('/account/signup', 303);
    }
  } catch (err) {
    console.log(err);
  }

  return redirect('/', 303);
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
  redirect,
  context,
}: SwellServerContext) {
  const { email, password_reset_key } = params;

  if (password_reset_key) {
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
    return;
  } catch (err) {
    console.log(err);
  }

  return redirect('/account/login', 303);
}

export async function accountPasswordReset({
  swell,
  theme,
  params,
  redirect,
}: SwellServerContext) {
  const { password_reset_key, password, password_confirmation } = params;

  if (!password_reset_key) {
    return redirect('/account/login', 303);
  }

  // Submit new password
  try {
    if (
      password_confirmation !== undefined &&
      password !== password_confirmation
    ) {
      await setInvalidPasswordResetConfirmationError(theme);
      return redirect(`/account/recover/${password_reset_key}`, 303);
    } else {
      const result = await swell.storefront.account.recover({
        password_reset_key,
        password,
      });

      if (result && !('errors' in result)) {
        await swell.storefront.account.login(result.email as string, password);
        return redirect('/account', 303);
      }
    }
  } catch (err: any) {
    console.log(err);
    if (err.message.includes('password_reset_key')) {
      await setInvalidResetKeyError(theme);
    } else {
      await setInvalidPasswordResetError(theme);
    }
    return redirect(
      `/account/recover${password_reset_key ? `/${password_reset_key}` : ''}`,
      303,
    );
  }

  return redirect('/account/login', 303);
}

export async function accountAddressCreateUpdate({
  url,
  params,
  swell,
  redirect,
}: SwellServerContext) {
  const { update_address_id, delete_address_id, address } = params;

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
      }
    }
  } catch (err) {
    console.log(err);
  }

  return redirect('/account/addresses', 303);
}

async function setLoginError(theme: SwellTheme) {
  theme.setFormData('account_login', {
    errors: [
      {
        code: 'invalid_credentials',
        field_name: 'email',
        field_label: await theme.lang(
          'forms.account_login.email',
          null,
          'Email',
        ),
        message: await theme.lang(
          'forms.account_login.invalid_credentials',
          null,
          'Invalid email or password',
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
          'forms.account_recover.invalid_reset_key',
          null,
          'Invalid account recovery key',
        ),
      },
    ],
  });
}

export async function setMissingResetKeyError(theme: SwellTheme) {
  theme.setFormData('account_password_reset', {
    errors: [
      {
        code: 'invalid_reset_key',
        field_name: 'password_reset_key',
        message: await theme.lang(
          'forms.account_recover.invalid_reset_key',
          null,
          'Missing account recovery key',
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
          'forms.account_recover.invalid_password_reset',
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
          'forms.account_recover.invalid_password_confirmation',
          null,
          'Password confirmation must match the provided password',
        ),
      },
    ],
  });
}

async function setCreateAccountErrors(theme: SwellTheme, errors: SwellData) {
  if (!errors.email && !errors.password) {
    return;
  }
  theme.setFormData('account_create', {
    errors: [
      ...(errors.email
        ? [
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
          ]
        : []),
      ...(errors.password
        ? [
            {
              code: 'invalid_password',
              field_name: 'password',
              field_label: await theme.lang(
                'forms.account_signup.password',
                null,
                'Password',
              ),
              message: await theme.lang(
                'forms.account_signup.invalid_password',
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
    ],
  },
];
