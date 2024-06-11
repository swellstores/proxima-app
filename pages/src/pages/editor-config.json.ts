import { resolveAsyncResources } from '@swell/storefrontjs';
import { handleServerRequest } from '@/utils/server';

const defaultPageId = 'index';

export const GET = handleServerRequest(
  defaultPageId,
  async ({ theme, params }: any) => {
    const pageTemplate = (await theme.renderPageTemplate(
      params.pageId || defaultPageId,
    )) as unknown;

    let [allSections, pageSections, layoutSectionGroups] = await Promise.all([
      theme.getAllSections(),
      theme.getPageSections(pageTemplate, false),
      theme.getLayoutSectionGroups(false),
    ]);

    pageSections = await resolveAsyncResources(pageSections);
    layoutSectionGroups = await resolveAsyncResources(layoutSectionGroups);

    return {
      pageTemplate,
      allSections,
      pageSections,
      layoutSectionGroups,
      globals: getEditorThemeGlobals(theme.globals),
    };
  },
);

function getEditorThemeGlobals(globals: SwellData) {
  const { menus, configs, settings, storefrontConfig, shopify_compatibility } =
    globals;
  const { editor, language, theme, presets } = configs;

  return {
    menus,
    settings,
    storefrontConfig,
    shopify_compatibility,
    configs: {
      editor,
      language,
      theme,
      presets,
    },
  };
}
