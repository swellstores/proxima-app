import React, { useEffect } from "react";
import { EasyblocksEditor } from "@easyblocks/editor";
import { getEasyblocksBackend, getEasyblocksPagePropsWithConfigs } from "../swell/easyblocks";

// TODO: fix all the types

let COMPONENTS: any;

export function getEasyblocksComponents(props: any) {
  const { pageId, sectionConfigs } = props;

  if (!COMPONENTS) {
    const sectionComponents = sectionConfigs.reduce(
      (acc: any, sectionData: any) => {
        const { section: { type } } = sectionData;
        acc[type] = function Section() {
          return <div />;
        };
        return acc;
      }, {});
    
    COMPONENTS = {
      ...sectionComponents,
      // Root component
      [`page_${pageId}`]: function Section() {
        return <div />;
      }
    };
  }
  
  return COMPONENTS;
}

export default function Editor(props: any) {
  const { sectionConfigs, pageId, lang } = props;
  const components = getEasyblocksComponents(props);

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

  const { easyblocksConfig } = getEasyblocksPagePropsWithConfigs(sectionConfigs, pageId, lang);

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
