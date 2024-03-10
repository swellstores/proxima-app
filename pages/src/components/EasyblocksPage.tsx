import React, { useState, useEffect } from "react";
import { EasyblocksEditor } from "@easyblocks/editor";
import { Config } from "@easyblocks/core";
import { Swell } from "../swell/api";
import { SwellTheme } from "../swell/theme";
import { getEasyblocksBackend, getEasyblocksPagePropsWithConfigs } from "../swell/easyblocks";

// TODO: fix all the types

let COMPONENTS: any;
 
function getRootComponent(props: any, sectionComponents: any) {
  return function RootContainer(props: any) {
    const { Root, Sections } = props;
    //console.log('root props', props)
    return (
      <Root.type {...Root.props}>
        {Sections.map((Section: any, index: number) => {
          // TODO: figure out why this component is not rendering on the server side
          return <Section.type {...Section.props} key={index} />;
        })}
      </Root.type>
    );
  }
}

function getSectionComponent(props: any, theme: SwellTheme, sectionConfig: any) {
  return function Section(props: any) {
    const { Root } = props;
    const [renderedOutput, setOutput] = useState(sectionConfig.output);

    //console.log('section props', props)

    /* useEffect(() => {
      theme.renderThemeTemplate(
        `sections/${sectionConfig.section.type}.liquid`,
        {
          ...pageData,
          ...sectionConfig.settings,
        },
      ).then((output: any) => {
        console.log('rendering again!')
        setOutput(output);
      });
    }, [JSON.stringify(sectionConfig.settings)]); */

    return (
      <Root.type {...Root.props}>
        <div dangerouslySetInnerHTML={{ __html: renderedOutput }} />;
      </Root.type>
    );
  }
}

export function getEasyblocksComponents(props: any) {
  const { pageId, sectionConfigs, swellClientProps } = props;

  if (!COMPONENTS) {
    const swell = new Swell(swellClientProps);
    const theme = new SwellTheme(swell);
    
    const sectionComponents = sectionConfigs.reduce(
      (acc: any, sectionConfig: any) => {
        const { section: { type } } = sectionConfig;
        acc[type] = getSectionComponent(props, theme, sectionConfig);
        return acc;
      }, {});
    
    COMPONENTS = {
      ...sectionComponents,
      // Root component
      [`page_${pageId}`]: getRootComponent(props, sectionComponents),
    };
  }
  
  return COMPONENTS;
}

export default function EasyblocksPage(props: any) {
  const { sectionConfigs, pageId, lang } = props;
  const components = getEasyblocksComponents(props);

  const { easyblocksConfig } = getEasyblocksPagePropsWithConfigs(sectionConfigs, pageId, lang);

  //console.log('render page', easyblocksConfig, components);

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
