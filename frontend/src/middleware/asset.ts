import { DYNAMIC_ASSET_URL } from '@/swell';
import { handleMiddlewareRequest, SwellServerContext } from '@/utils/server';

const CONTENT_TYPES: Record<string, string> = {
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.html': 'text/html',
};

const renderDynamicAsset = handleMiddlewareRequest(
  'GET',
  `${DYNAMIC_ASSET_URL}:asset_name`,
  async ({ theme, params }: SwellServerContext) => {
    const { asset_name } = params;

    try {
      await theme.themeLoader.init();

      const config = await theme.getAssetConfig(asset_name);

      if (!config) {
        return new Response(`Asset config not found: ${asset_name}`, {
          status: 404,
        });
      }

      const content = await theme.renderTemplateString(config?.file_data || '');
      const contentType = getContentType(asset_name);

      return new Response(content, {
        status: 200,
        headers: {
          'Content-Type': contentType,
        },
      });
    } catch (error) {
      console.error(`Failed to render asset: ${asset_name}`, error);

      return new Response('Internal Server Error', { status: 500 });
    }
  },
);

function getContentType(assetName: string): string {
  const assetFileName = assetName.replace(/\.liquid$/, '');

  for (const [ext, type] of Object.entries(CONTENT_TYPES)) {
    if (assetFileName.endsWith(ext)) {
      return type;
    }
  }

  return 'text/plain';
}

export default [renderDynamicAsset];
