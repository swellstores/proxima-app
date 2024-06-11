import EasyblocksEditor from '@/components/EasyblocksEditor.jsx';
import {
  Swell,
  SwellTheme,
  getEasyblocksPagePropsWithConfigs,
  removeCircularReferences,
} from '@swell/storefrontjs';
import storefrontConfig from '../../storefront.json';

import StorefrontShopifyCompatibility from '@/resources/shopify-compatibility';

export async function GET({ params, request, url }) {
  const initialPageId = 'index';

  // // Editor requires rootComponent param
  // if (!Astro.url.searchParams.get('rootTemplate')) {
  //   return Astro.redirect(`/editor?rootTemplate=page_${initialPageId}`);
  // }
  const swell = new Swell({
    serverHeaders: request.headers,
    url,
  });
  const theme = new SwellTheme(swell, {
    storefrontConfig,
    shopifyCompatibilityClass: StorefrontShopifyCompatibility,
  });

  await theme.initGlobals(initialPageId);
  await theme.lang('en');

  const sectionGroup = (await theme.renderPageTemplate(
    initialPageId,
  )) as unknown as ThemeSectionGroup;

  let [sectionConfigs, pageSections, layoutSectionGroups] = await Promise.all([
    theme.getSectionGroupConfigs(sectionGroup),
    theme.getPageSections(),
    theme.getLayoutSectionGroups(),
  ]);

  sectionConfigs = removeCircularReferences(sectionConfigs);
  pageSections = removeCircularReferences(pageSections);
  layoutSectionGroups = removeCircularReferences(layoutSectionGroups);

  const { easyblocksConfig } = getEasyblocksPagePropsWithConfigs(
    sectionConfigs,
    pageSections,
    layoutSectionGroups,
    'index',
  );

  const json = JSON.stringify({
    easyblocksConfig,
    pageSections,
    layoutSectionGroups,
    sectionConfigs,
  });

  return new Response(json);
}
