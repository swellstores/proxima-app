import { DYNAMIC_ASSET_URL } from '@/swell';
import { handleMiddlewareRequest, SwellServerContext } from '@/utils/server';

const renderDynamicAsset = handleMiddlewareRequest(
  'GET',
  `${DYNAMIC_ASSET_URL}:asset_name`,
  async ({ theme, params }: SwellServerContext) => {
    const { asset_name } = params;

    await theme.themeLoader.init();

    const config = await theme.getAssetConfig(asset_name);
    const content = await theme.renderTemplateString(config?.file_data || '');
    const contentType = getContentType(asset_name);

    return new Response(content, {
      status: 200,
      headers: {
        'Content-Type': contentType,
      },
    });
  },
);

function getContentType(assetName: string): string {
  const assetFileName = assetName.replace(/\.liquid$/, '');

  if (!assetFileName) return 'text/plain';

  if (assetFileName.endsWith('.js')) return 'application/javascript';
  if (assetFileName.endsWith('.css')) return 'text/css';
  if (assetFileName.endsWith('.svg')) return 'image/svg+xml';
  if (assetFileName.endsWith('.json')) return 'application/json';
  if (assetFileName.endsWith('.html')) return 'text/html';

  return 'text/plain';
}

export default [renderDynamicAsset];
