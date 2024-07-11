import { SwellTheme, resolveAsyncResources } from '@swell/storefrontjs';
import { handleServerRequest } from '@/utils/server';

const defaultPageId = 'index';

export const GET = handleServerRequest(
  async ({ swell, theme, params }: any) => {
    const pageTemplate = (await theme.renderPageTemplate(
      params.pageId || defaultPageId,
    )) as unknown;

    let allSections = await theme.getAllSections();
    let pageSections = await theme.getPageSections(pageTemplate, false);
    let layoutSectionGroups = await theme.getLayoutSectionGroups(false);

    pageSections = await resolveAsyncResources(pageSections);
    layoutSectionGroups = await resolveAsyncResources(layoutSectionGroups);

    const swellClientProps = swell.getClientProps();

    return {
      pageTemplate,
      allSections,
      pageSections,
      layoutSectionGroups,
      globals: getEditorThemeGlobals(theme),
      swellClientProps: getSwellClientProps(swellClientProps),
    };
  },
);

function getEditorThemeGlobals(theme: SwellTheme) {
  const { settings, menus, page, shopify_compatibility, configs } =
    theme.globals || {};

  const { editor, translations, theme: themeJson, presets } = configs;

  return {
    settings,
    menus,
    page,
    storefrontConfig: theme.props, // TODO: rename this for editor
    shopify_compatibility,
    configs: {
      editor,
      translations,
      theme: themeJson,
      presets,
    },
  };
}

function getSwellClientProps(swellClientProps: any) {
  const { url, instanceId, isEditor, isPreview, headers, swellHeaders } =
    swellClientProps;

  return {
    url,
    instanceId,
    isEditor,
    isPreview,
    headers,
    swellHeaders,
  };
}
