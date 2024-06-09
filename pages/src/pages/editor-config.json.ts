import {
  getEditorLanguageConfig,
  resolveAsyncResources,
} from '@swell/storefrontjs';
import { handleServerRequest } from '@/utils/server';

const defaultPageId = 'index';

export const GET = handleServerRequest(
  defaultPageId,
  async ({ swell, theme, params }: any) => {
    const pageTemplate = (await theme.renderPageTemplate(
      params.pageId || defaultPageId,
    )) as unknown;

    let [allSections, pageSections, layoutSectionGroups, editorLang] =
      await Promise.all([
        theme.getAllSections(),
        theme.getPageSections(pageTemplate),
        theme.getLayoutSectionGroups(),
        getEditorLanguageConfig(swell),
      ]);

    pageSections = await resolveAsyncResources(pageSections);
    layoutSectionGroups = await resolveAsyncResources(layoutSectionGroups);

    return {
      pageTemplate,
      allSections,
      pageSections,
      layoutSectionGroups,
      editorLang,
      pages: theme.storefrontConfig.pages,
    };
  },
);
