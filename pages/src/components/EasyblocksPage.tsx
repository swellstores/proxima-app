import React, { useState, useEffect, Fragment } from "react";
import { EasyblocksEditor } from "@easyblocks/editor";
import { Parser as HtmlToReactParser, ProcessNodeDefinitions } from 'html-to-react';
import { toJSON } from 'flatted';
import { Swell } from "../swell/api";
import { SwellTheme } from "../swell/theme";
import { getEasyblocksBackend, getEasyblocksPagePropsWithConfigs } from "../swell/easyblocks";

// TODO: fix all the types

let COMPONENTS: any;
 
function getRootComponent(props: any, sectionComponents: any) {
  return function RootContainer(props: any) {
    const { Root, Sections } = props;

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
  const { pageProps } = props;

  const htmlToReactParser = HtmlToReactParser();

  return function Section(props: any) {
    const { Root, Blocks, __easyblocks, ...settingProps } = props;
    const [outputElements, setOutput] = useState(null);

    useEffect(() => {
      const sectionData = {
        ...pageProps,
        section: {
          ...sectionConfig.settings.section,
          settings: {
            ...sectionConfig.settings.section?.settings,
            ...settingProps,
          },
          ...(Blocks?.length
            ? {
              blocks: Blocks?.map((block: any) => ({
                  type: block.props.compiled._component.split('__').pop(),
                  settings: block.props.compiled.props
                }))
              }
            : {}),
        }
      };
      theme.renderThemeTemplate(
        `sections/${sectionConfig.section.type}.liquid`,
        sectionData,
      ).then((output: any) => {
        const outputElements = htmlToReactParser.parseWithInstructions(output, isValidNode, getBlockProcessingInstructions(Blocks));
        setOutput(outputElements);
      });
    }, [toJSON({ settingProps, Blocks: Blocks?.map((block: any) => block.props) })]);

    return (
      <Root.type {...Root.props}>
        {outputElements}
      </Root.type>
    );
  }
}

// No idea why this is necessary
const isValidNode = () => true;

function getBlockProcessingInstructions(Blocks: any) {
  const processNodeDefinitions = ProcessNodeDefinitions();
  let blockIndex = 0;
  return [
    {
      shouldProcessNode: function (node: any) {
        return node.attribs?.class === 'swell-block';
      },
      processNode: function (_node: any, children: any) {
        const Block = Blocks[blockIndex++];
        return React.createElement(BlockComponent, { Root: Block }, children);
      }
    },
    {
      // Process all other nodes
      shouldProcessNode: function () {
        return true;
      },
      processNode: processNodeDefinitions.processDefaultNode,
    }
  ];
}

function BlockComponent(props: any) {
  const { Root, children } = props;

  return (
    <Root.type {...Root.props}>
      {children}
    </Root.type>
  );
}

export function getEasyblocksComponents(swell: Swell, props: any) {
  const { pageId, sectionConfigs } = props;

  if (!COMPONENTS) {
    const theme = new SwellTheme(swell);
    
    const sectionComponents = sectionConfigs.reduce(
      (acc: any, sectionConfig: any) => {
        const { section: { type } } = sectionConfig;
        acc[type] = getSectionComponent(props, theme, sectionConfig);
        return acc;
      }, {});
    
    const blockComponents = sectionConfigs.reduce(
      (acc: any, sectionConfig: any) => {
        const { section: { type }, schema } = sectionConfig;
        if (schema?.blocks) {
          for (const block of schema.blocks) {
            acc[`block__${type}__${block.type}`] = BlockComponent;
          }
          return acc;
        }
        return acc;
      }, {});
    
    COMPONENTS = {
      ...sectionComponents,
      ...blockComponents,
      // Root component
      [`page_${pageId}`]: getRootComponent(props, sectionComponents),
    };
  }
  
  return COMPONENTS;
}

export default function EasyblocksPage(props: any) {
  const { sectionConfigs, pageId, lang, swellClientProps } = props;

  const [ready, setReady] = useState(false);

  // Load only when client is ready
  useEffect(() => setReady(true), [])
  if (!ready) {
    return null;
  }

  const swell = new Swell({ ...swellClientProps, isEditor: true });
  const components = getEasyblocksComponents(swell, props);

  const { easyblocksConfig } = getEasyblocksPagePropsWithConfigs(sectionConfigs, pageId, lang);

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
