import { handleMiddlewareRequest } from '@/utils/server';

export const performLogin = handleMiddlewareRequest(
  'POST',
  '/account/login',
  async (context: any) => {
    const { params, swell, theme, redirect } = context;
    const { email, password } = params;

    const result = await swell.storefront.account.login(email, password);

    if (result) {
      setLoginSuccess(theme);
      return redirect('/account', 303);
    }

    await setLoginError(theme);
  },
  'account/login',
);

export const performLogout = handleMiddlewareRequest(
  'GET',
  '/account/logout',
  async ({ swell, redirect }: any) => {
    await swell.storefront.account.logout();

    return redirect('/', 303);
  },
  'account/index',
);

export const ensureAccountLoggedIn = handleMiddlewareRequest(
  'GET',
  (path: string) => path.startsWith('/account') && path !== '/account/login',
  async ({ swell, redirect }: any) => {
    const loggedIn =
      swell.storefront.account.state?.id ||
      (await swell.storefront.account.get());

    if (!loggedIn) {
      return redirect('/account/login', 303);
    }
  },
);

function setLoginSuccess(theme: SwellTheme) {
  theme.setFormData('customer_login', {
    success: true,
  });
}

async function setLoginError(theme: SwellTheme) {
  const field_label = await theme.lang(
    'pages.account_login.email',
    null,
    'Email',
  );

  const message = await theme.lang(
    'pages.account_login.invalid_credentials',
    null,
    'Invalid email or password',
  );

  theme.setFormData('customer_login', {
    errors: [
      {
        code: 'invalid_credentials',
        field_name: 'email',
        field_label,
        message,
      },
    ],
  });
}
