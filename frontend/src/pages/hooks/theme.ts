import { handleServerRequest } from '@/utils/server';

import type { SwellServerContext } from '@/utils/server';

export async function handleThemeRequest(
  serverContext: SwellServerContext,
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
  const { version, configs } = params;
  await theme.preloadThemeConfigs(version, configs);

  return { success: true };
}

export const POST = handleServerRequest(handleThemeRequest);
