import { handleServerRequest } from '@/utils/server';

const handleThemeRequest = handleServerRequest(async ({ swell, context }) => {
  const { locals, request } = context;

  // Warm the theme cache.
  await loadTheme(locals.theme);

  const { swellHeaders } = swell;
  const themeId = swellHeaders['theme-id'];
  const themeVersion = String(swellHeaders['theme-config-version']);

  const result = {
    storefront: swell.instanceId,
    theme: {
      id: themeId,
      version: themeVersion,
    } 
  };

  return new Response(
    JSON.stringify(result), {
      status: 200,
      headers: {
        "Content-Type": "application/json"
      }
    }
  );
});

/**
 * Pro-loads a theme into cache.
 */
async function loadTheme(theme) {
  // Ensure that the entire bundle is cached.
  // TODO: Implement new theme-version-manifest workflow
  await theme.getAllThemeConfigs(); 
}

// TODO: The GET handler exists solely for ease of debugging.
//       Remove the GET handler once POST request is fully implemented.
export const GET = handleThemeRequest;

export const POST = handleThemeRequest;
