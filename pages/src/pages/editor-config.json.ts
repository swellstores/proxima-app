import { resolveAsyncResources } from '@swell/storefrontjs';
import { handleServerRequest } from '@/utils/server';

const defaultPageId = 'index';

export const GET = handleServerRequest(
  defaultPageId,
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
      globals: getEditorThemeGlobals(theme.globals),
      swellClientProps: getSwellClientProps(swellClientProps),
    };
  },
);

function getEditorThemeGlobals(globals: SwellData) {
  const {
    settings,
    menus,
    page,
    localeCode,
    storefrontConfig,
    shopify_compatibility,
    configs,
  } = globals;

  const { editor, translations, theme, presets } = configs;

  return {
    settings,
    menus,
    page,
    localeCode,
    storefrontConfig,
    shopify_compatibility,
    configs: {
      editor,
      translations,
      theme,
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
