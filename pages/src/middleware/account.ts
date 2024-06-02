import { handleMiddlewareRequest } from '@/utils/server';

export const postLogin = handleMiddlewareRequest(
  'POST',
  '/account/login',
  async (context: any) => {
    const { params, swell, theme, redirect } = context;
    const { email, password } = params;

    const result = await swell.storefront.account.login(email, password);

    if (result) {
      return redirect('/account', 303);
    }

    await setLoginError(theme);
    return redirect('/account/login', 303);
  },
  'account/login',
);

export const postLogout = handleMiddlewareRequest(
  'GET',
  '/account/logout',
  async ({ swell, redirect }: any) => {
    await swell.storefront.account.logout();

    return redirect('/', 303);
  },
  'account/index',
);

export const postCreateAccount = handleMiddlewareRequest(
  'POST',
  '/account',
  async ({ swell, theme, params, redirect }: any) => {
    try {
      const result = await swell.storefront.account.create(params);
      if (result?.errors) {
        await setCreateAccountErrors(theme, result.errors);
        return redirect('/account/signup', 303);
      }
    } catch (err) {
      console.log(err);
    }

    return redirect('/', 303);
  },
  'account/signup',
);

export const validateAccountResetKey = handleMiddlewareRequest(
  'GET',
  (path: string) => path.startsWith('/account/recover'),
  async ({ url, swell, theme }: any) => {
    const passwordResetKey = url.pathname.split('/')[3];

    theme.setGlobals({ password_reset_key: passwordResetKey });

    try {
      const account =
        passwordResetKey &&
        (await swell.get('/accounts/:last', {
          password_reset_key: passwordResetKey,
        }));

      if (!account) {
        await setInvalidResetKeyError(theme);
      }
    } catch (err) {
      console.log(err);
    }
  },
  'account/recover',
);

export const postAccountReset = handleMiddlewareRequest(
  'POST',
  '/account/recover',
  async ({ swell, theme, params, redirect, context }: any) => {
    const { email, password_reset_key, password, password_confirmation } =
      params;

    if (email) {
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
    } else if (password !== undefined) {
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

          if (result?.email) {
            await swell.storefront.account.login(result.email, password);
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
      }
    }

    return redirect(`/account/login`, 303);
  },
  'account/recover',
);

export const ensureAccountLoggedIn = handleMiddlewareRequest(
  'GET',
  (path: string) =>
    path.startsWith('/account') &&
    !path.startsWith('/account/login') &&
    !path.startsWith('/account/signup') &&
    !path.startsWith('/account/recover'),
  async ({ swell, redirect }: any) => {
    const loggedIn = await swell.storefront.account.get();

    if (!loggedIn) {
      return redirect('/account/login', 303);
    }
  },
);

export const postCreateOrUpdateAddress = handleMiddlewareRequest(
  'POST',
  (path: string) => path.startsWith('/account/addresses'),
  async ({ url, params, swell, redirect }: any) => {
    const { account_address_id } = params;

    const deleteAddressId = url.pathname.split('/')[3];

    try {
      if (deleteAddressId) {
        await swell.storefront.account.deleteAddress(deleteAddressId);
      } else {
        const data = {
          first_name: params.first_name,
          last_name: params.last_name,
          company: params.company,
          address1: params.address1,
          address2: params.address2,
          city: params.city,
          country: params.country,
          state: params.state,
          zip: params.zip,
          phone: params.phone,
        };

        let result;
        if (account_address_id) {
          result = await swell.storefront.account.updateAddress(
            account_address_id,
            data,
          );
        } else {
          result = await swell.storefront.account.createAddress(data);
        }
        if (result?.errors) {
          console.log(result.errors);
        }
      }
    } catch (err) {
      console.log(err);
    }

    return redirect('/account/addresses', 303);
  },
  'account/addresses',
);

function setFormSuccess(theme: SwellTheme, formId: string) {
  theme.setFormData(formId, {
    success: true,
  });
}

async function setLoginError(theme: SwellTheme) {
  theme.setFormData('customer_login', {
    errors: [
      {
        code: 'invalid_credentials',
        field_name: 'email',
        field_label: await theme.lang(
          'pages.account_login.email',
          null,
          'Email',
        ),
        message: await theme.lang(
          'pages.account_login.invalid_credentials',
          null,
          'Invalid email or password',
        ),
      },
    ],
  });
}

async function setInvalidResetKeyError(theme: SwellTheme) {
  theme.setFormData('reset_customer_password', {
    errors: [
      {
        code: 'invalid_reset_key',
        field_name: 'password_reset_key',
        message: await theme.lang(
          'pages.account_recover.invalid_reset_key',
          null,
          'Invalid account recovery key',
        ),
      },
    ],
  });
}

async function setInvalidPasswordResetError(theme: SwellTheme) {
  theme.setFormData('reset_customer_password', {
    errors: [
      {
        code: 'invalid_password_reset',
        field_name: 'password',
        message: await theme.lang(
          'pages.account_recover.invalid_password_reset',
          null,
          'Invalid password',
        ),
      },
    ],
  });
}

async function setInvalidPasswordResetConfirmationError(theme: SwellTheme) {
  theme.setFormData('reset_customer_password', {
    errors: [
      {
        code: 'invalid_password_confirmation',
        field_name: 'password_confirmation',
        message: await theme.lang(
          'pages.account_recover.invalid_password_confirmation',
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
  theme.setFormData('create_customer', {
    errors: [
      ...(errors.email
        ? [
            {
              code: 'invalid_email',
              field_name: 'email',
              field_label: await theme.lang(
                'pages.account_signup.email',
                null,
                'Email',
              ),
              message: await theme.lang(
                'pages.account_signup.invalid_email',
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
                'pages.account_signup.password',
                null,
                'Password',
              ),
              message: await theme.lang(
                'pages.account_signup.invalid_password',
                null,
                'Invalid password',
              ),
            },
          ]
        : []),
    ],
  });
}