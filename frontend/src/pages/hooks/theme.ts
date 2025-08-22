import { handleServerRequest } from '@/utils/server';

import type { SwellServerContext } from '@/utils/server';
import type { SwellThemePreload } from '@swell/apps-sdk';

export async function handleThemeRequest(
  serverContext: SwellServerContext<SwellThemePreload>,
): Promise<object> {
  const {
    context: { request },
    theme,
    params,
  } = serverContext;

  if (request.headers.get('Content-Type') !== 'application/json') {
    return new Response(null, { status: 400 });
  }

  // Preload manifest and any configs passed in via the request.
  await theme.updateThemeConfigs(params);

  return { success: true };
}

export const POST = handleServerRequest(handleThemeRequest);
