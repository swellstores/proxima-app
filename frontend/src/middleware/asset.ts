import { DYNAMIC_ASSET_URL } from '@/swell';
import { handleMiddlewareRequest, SwellServerContext } from '@/utils/server';

const renderDynamicAsset = handleMiddlewareRequest(
  'GET',
  `${DYNAMIC_ASSET_URL}:asset_name`,
  async ({ swell, theme, params, context }: SwellServerContext) => {
    const { asset_path } = params;
    const config = await theme.getAssetConfig(asset_path);

    // TODO:
    // - Render the config file data, passing in the `settings` object
    // - Return the response with the appropriate content type (e.g. application/javascript, text/css)
  },
);

export default [renderDynamicAsset];
