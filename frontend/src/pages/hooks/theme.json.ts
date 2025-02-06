import { handleServerRequest } from '@/utils/server';

import type { SwellServerContext } from '@/utils/server';

export async function handleThemeRequest(serverContext: SwellServerContext) : Promise<Response> {
  const { context: { request }, theme } = serverContext;

  if (request.headers.get('Content-Type') !== 'application/json') {
    return new Response(null, { status: 400 });
  }

  // Preload manifest and any configs passed in via the request.
  const { version, configs } = await request.json();
  await theme.preloadThemeConfigs(version, configs);

  return new Response(JSON.stringify({success: true}), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

export const POST = handleServerRequest(handleThemeRequest);
