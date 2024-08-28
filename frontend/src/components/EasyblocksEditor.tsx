import React, { useState, useEffect } from 'react';
import { EasyblocksEditor } from '@swell/easyblocks-editor';
import {
  getEasyblocksPagePropsWithConfigs,
  getEasyblocksComponentDefinitions,
} from '@swell/apps-sdk';

import { TestMenuWidget } from './TestMenuWidget';

// TODO: fix all the types

export function getEasyblocksComponents(props: any) {
  return getEasyblocksComponentDefinitions(
    props,
    (_type: string, _data: any) => {
      // Use placeholders for all types
      return function PlaceholderComponent() {
        return <div />;
      };
    },
  );
}

export default function Editor(props: any) {
  const { pageId, pageRoute, allSections, pageSections, layoutSectionGroups } =
    props;
  const [easyblocksConfig, setEasyblocksConfig] = useState<any>(null);
  const [components, setComponents] = useState<any>(null);

  // In child iframe, auto redirect to index page with editor params
  if (!(window as any).isShopstoryEditor) {
    useEffect(() => {
      setTimeout(() => {
        const iframe = document.getElementById('shopstory-canvas');
        if (iframe) {
          (iframe as any).src =
            `${pageRoute}?_editor&rootTemplate=swell_page&child=true`;
        }
      }, 1000);
    }, []);
  }

  useEffect(() => {
    const components = getEasyblocksComponents(props);
    setComponents(components);

    const { easyblocksConfig } = getEasyblocksPagePropsWithConfigs(
      themeGlobals,
      allSections,
      pageSections,
      layoutSectionGroups,
      pageId,
    );
    setEasyblocksConfig(easyblocksConfig);
  }, []);

  if (!easyblocksConfig) {
    return 'Loading...';
  }

  return (
    <EasyblocksEditor
      config={easyblocksConfig}
      widgets={{
        menu: TestMenuWidget,
      }}
      components={components}
      __debug={true}
    />
  );
}
