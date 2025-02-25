import { Swell, SwellTheme } from '@swell/apps-sdk';

import type { SwellServerContext } from '@/utils/server';

import { handleThemeRequest } from './theme';

describe('#handleThemeRequest', () => {
  it('invokes theme preloader', async () => {
    const swell = new Swell({
      headers: {},
      swellHeaders: {
        'public-key': 'publickey',
        'store-id': 'test',
      },
      url: new URL('https://storefront.app'),
    });

    const theme = new SwellTheme(swell, {});

    const request = new Request(new URL('http://localhost/hooks/theme'), {
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });

    const requestParams = {
      version: {
        hash: 'versionhash',
        manifest: {},
      },
      configs: [{ hash: 'confighash' }],
    };

    const serverContext = {
      context: { request },
      params: requestParams,
      swell,
      theme,
    };

    const spy = jest.spyOn(theme, 'preloadThemeConfigs');

    const response = (await handleThemeRequest(
      serverContext as unknown as SwellServerContext,
    )) as any;

    expect(response).toEqual({ success: true });

    expect(spy).toHaveBeenCalledWith(
      requestParams.version,
      requestParams.configs,
    );
  });
});
