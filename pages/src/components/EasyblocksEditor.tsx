import React, { useState, useEffect } from "react";
import { EasyblocksEditor } from "@easyblocks/editor";
import { getEasyblocksBackend, getEasyblocksPagePropsWithConfigs, getEasyblocksComponentDefinitions } from "../swell/easyblocks";

// TODO: fix all the types

export function getEasyblocksComponents(props: any) {
  const { pageId } = props;

  return getEasyblocksComponentDefinitions(props, pageId, (_type: string, _data: any) => {
    // Use placeholders for all types
    return function PlaceholderComponent() {
      return <div />;
    }
  });
}

export default function Editor(props: any) {
  const { sectionConfigs, pageSections, layoutSectionGroups, pageId, lang } = props;
  const [easyblocksConfig, setEasyblocksConfig] = useState<any>(null);
  const [components, setComponents] = useState<any>(null);

  // In child iframe, auto redirect to index page with editor params
  if (!(window as any).isShopstoryEditor) {
    useEffect(() => {
      setTimeout(() => {
        const iframe = document.getElementById('shopstory-canvas');
        if (iframe) {
          (iframe as any).src = `/?_editor&_editorFrame&rootComponent=page_${props.pageId}`;
        }
      }, 1000);
    }, []);
  }

  useEffect(() => {
    const components = getEasyblocksComponents(props);
    setComponents(components);

    const { easyblocksConfig } = getEasyblocksPagePropsWithConfigs(sectionConfigs, pageSections, layoutSectionGroups, pageId, lang);
    setEasyblocksConfig(easyblocksConfig);
  }, []);

  if (!easyblocksConfig) {
    return 'Loading...';
  }

  //console.log('render first', easyblocksConfig, components);

  return (
    <EasyblocksEditor
      config={{
        ...easyblocksConfig,
        backend: getEasyblocksBackend(props.sectionConfigs),
      }}
      components={components}
      __debug={true}
    />
  );
}
