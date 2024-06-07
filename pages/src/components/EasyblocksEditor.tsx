import React, { useState, useEffect } from "react";
import { EasyblocksEditor } from "@easyblocks/editor";
import {
  getEasyblocksBackend,
  getEasyblocksPagePropsWithConfigs,
  getEasyblocksComponentDefinitions,
} from '@swell/storefrontjs';

import { TestMenuWidget } from './TestMenuWidget';

// TODO: fix all the types

export function getEasyblocksComponents(props: any) {
  const { pageId } = props;

  return getEasyblocksComponentDefinitions(
    props,
    pageId,
    (_type: string, _data: any) => {
      // Use placeholders for all types
      return function PlaceholderComponent() {
        return <div />;
      };
    },
  );
}

export default function Editor(props: any) {
  const {
    allSections,
    pageSections,
    layoutSectionGroups,
    pageId,
    pageRoute,
    lang,
  } = props;
  const [easyblocksConfig, setEasyblocksConfig] = useState<any>(null);
  const [components, setComponents] = useState<any>(null);

  // In child iframe, auto redirect to index page with editor params
  if (!(window as any).isShopstoryEditor) {
    useEffect(() => {
      setTimeout(() => {
        const iframe = document.getElementById('shopstory-canvas');
        if (iframe) {
          (iframe as any).src = `${pageRoute}?_editor&rootComponent=swell_page`;
        }
      }, 1000);
    }, []);
  }

  useEffect(() => {
    const components = getEasyblocksComponents(props);
    setComponents(components);

    const { easyblocksConfig } = getEasyblocksPagePropsWithConfigs(
      allSections,
      pageSections,
      layoutSectionGroups,
      pageId,
      lang,
    );
    setEasyblocksConfig(easyblocksConfig);
  }, []);

  if (!easyblocksConfig) {
    return 'Loading...';
  }

  return (
    <EasyblocksEditor
      config={{
        ...easyblocksConfig,
        backend: getEasyblocksBackend(),
      }}
      widgets={{
        menu: TestMenuWidget,
      }}
      components={components}
      __debug={true}
    />
  );
}
