import { Swell, SwellTheme } from '@swell/apps-sdk';

import type { SwellServerContext } from '@/utils/server';

import { handleThemeRequest } from './theme.json';

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

    const request = new Request(
      new URL('http://localhost/hooks/theme.json'),
      {
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
      },
    );

    const requestParams = {
      version: {
        hash: 'versionhash',
        manifest: {},
      },
      configs: [
        { hash: 'confighash' },
      ],
    };

    // Simulate a request with 
    jest.spyOn(request, 'json').mockResolvedValue(requestParams);

    const serverContext = {
      context: { request },
      params: {},
      swell,
      theme,
    } as SwellServerContext;

    const spy = jest.spyOn(theme, 'preloadThemeConfigs');

    const response = await handleThemeRequest(serverContext);

    expect(response.status).toEqual(200);
    expect(await response.json()).toEqual({ success: true });

    expect(spy).toHaveBeenCalledWith(requestParams.version, requestParams.configs);
  });
});
