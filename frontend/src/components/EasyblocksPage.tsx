import React, {
  useState,
  useEffect,
  createContext,
  useContext,
  Fragment,
} from 'react';
import ReactDOMServer from 'react-dom/server';
import { EasyblocksEditor } from '@swell/easyblocks-editor';
import {
  Parser as HtmlToReactParser,
  ProcessNodeDefinitions,
} from 'html-to-react';
import { stringify } from 'flatted';
import {
  Swell,
  SwellTheme,
  resolveThemeSettings,
  resolveSectionSettings,
  getEasyblocksPagePropsWithConfigs,
  getEasyblocksComponentDefinitions,
  getThemeSettingsFromProps,
  getSectionSettingsFromProps,
} from '@swell/apps-sdk';
import { initTheme } from '@/swell';
import StorefrontShopifyCompatibility from '@/utils/shopify-compatibility';

// TODO: fix all the types

const htmlToReactParser = HtmlToReactParser();
const processNodeDefinitions = ProcessNodeDefinitions();

// No idea why this is needed
const isValidNode = () => true;

function ContentWrapper({ children }: any) {
  return <Fragment>{children}</Fragment>;
}

function SectionGroup({ Root, Sections }: any) {
  return (
    <Root.type {...Root.props}>
      {Sections.map((Section: any, index: number) => (
        <Section.type {...Section.props} key={index} />
      ))}
    </Root.type>
  );
}

function Block({ Root, children }: any) {
  return <Root.type {...Root.props}>{children}</Root.type>;
}

function getRootComponent(props: any, theme: SwellTheme) {
  const { layoutProps, pageProps, pageContent } = props;

  return function RootContainer(props: any) {
    const { Root } = props;
    const [Content, setContent] = useState(<div />);
    const [RootContext, setRootContext] = useState<any>(null);

    const editorSchema = pageProps.configs?.editor?.settings;
    const settingProps = getThemeSettingsFromProps(props, editorSchema);

    useEffect(() => {
      const settings = resolveThemeSettings(theme, settingProps, editorSchema);
      console.log('render layout', { settings });

      theme.setGlobals({ settings });

      // Render theme page directly when it's a raw liquid file
      const stringOutput =
        typeof pageContent === 'string'
          ? theme.renderTemplateString(pageContent, pageProps)
          : undefined;

      theme
        .renderLayout({
          ...layoutProps,
          content_for_header: theme.getContentForHeader(),
          content_for_layout: '<content-for-layout></content-for-layout>',
        })
        .then((output: any) => {
          const RootContext = createContext(null);

          const RootElements = htmlToReactParser.parseWithInstructions(
            output,
            isValidNode,
            getLayoutProcessingInstructions(RootContext, stringOutput),
          );

          const Content = RootElements.find(
            (element: any) => element.type === ContentWrapper,
          ) || (
            // TODO: nicer UI for rendering this error
            <div>Theme layout is missing a valid &lt;html&gt; tag</div>
          );

          setContent(Content);
          setRootContext(RootContext);
        });
    }, [theme.liquidSwell.layoutName, stringify(settingProps)]);

    return (
      <Root.type {...Root.props}>
        {RootContext && (
          <RootContext.Provider value={props}>
            <Content.type {...Content.props} />
          </RootContext.Provider>
        )}
      </Root.type>
    );
  };
}

function getPageSectionComponent(
  _props: any,
  theme: SwellTheme,
  sectionSchema: any,
) {
  return function Section(props: any) {
    const { Root, Blocks } = props;
    const [SectionElements, setOutput] = useState(null);

    const settingProps = getSectionSettingsFromProps(props, sectionSchema);

    useEffect(() => {
      const sectionData = resolveSectionSettings(theme, {
        settings: { section: settingProps },
        schema: sectionSchema,
      });

      console.log('render section', sectionSchema.id, sectionData);

      theme
        .renderThemeTemplate(
          `theme/sections/${sectionSchema.id}.liquid`,
          sectionData,
        )
        .then((output: any) => {
          const SectionElements = htmlToReactParser.parseWithInstructions(
            output,
            isValidNode,
            getPageBlockProcessingInstructions(Blocks),
          );
          setOutput(SectionElements);
        });
    }, [stringify(settingProps)]);

    return <Root.type {...Root.props}>{SectionElements}</Root.type>;
  };
}

function getLayoutProcessingInstructions(
  RootContext: any,
  stringOutput?: string,
) {
  let bodyItems: any;

  return [
    {
      // Replace layout group sections with the actual components
      shouldProcessNode: function (node: any) {
        return node.attribs?.class?.startsWith?.('swell-section-group');
      },
      processNode: function (node: any) {
        const sectionGroupId = node.attribs.id?.split('__').pop();

        function SectionGroup() {
          const rootProps = useContext(RootContext) as any;

          const SectionGroupSections =
            rootProps[`SectionGroup_${sectionGroupId}`];

          return (
            <div className={node.attribs.class} id={node.attribs.id}>
              {SectionGroupSections &&
                SectionGroupSections.map((Section: any, index: number) => (
                  <Section.type {...Section.props} key={index} />
                ))}
            </div>
          );
        }

        return React.createElement(SectionGroup);
      },
    },
    {
      // Pull relevant tags out of head
      shouldProcessNode: function (node: any) {
        return node.name === 'head';
      },
      processNode: function (_node: any, children: any) {
        document.head.insertAdjacentHTML(
          'beforeend',
          ReactDOMServer.renderToStaticMarkup(children),
        );
        // Styles to fix easyblocks styles
        const selectable = `div[aria-roledescription="sortable"]`;
        document.head.insertAdjacentHTML(
          'beforeend',
          `
          <style data-swell-editor-overrides>
            /* Make the selected borders more visible */
            ${selectable}::after {
              border-radius: 3px !important;
            }
            ${selectable}[data-active="true"]::after {
              border-width: 3px !important;
            }

            /* Add an overlay color when hovering a selectable element */
            ${selectable}:hover::after {
              opacity: 1 !important;
              background-color: rgba(34, 150, 254, 0.06) !important;
            }

            /* Hide parent overlay color when hovering a selectable child element */
            ${selectable}:has(* ${selectable}:hover)::after {
              background-color: transparent !important;
            }

            /* Show borders around child blocks when hovering parent */
            ${selectable}:not(:has(* ${selectable}:hover)):hover ${selectable}::after {
              border-width: 1px !important;
              border-style: dashed !important;
              opacity: 1 !important;
            }

            /* Fix for any global styles that might affect empty divs */
            ${selectable} > div:first-child {
              display: block !important;
            }
          </style>
        `,
        );
        return false;
      },
    },
    {
      // Pull out body elements
      shouldProcessNode: function (node: any) {
        return node.name === 'body';
      },
      processNode: function (node: any, children: any) {
        bodyItems = children;
        document.body.className = node.attribs.class;
        return false;
      },
    },
    {
      shouldProcessNode: function (node: any) {
        return node.name === 'content-for-layout';
      },
      processNode: function (_node: any, _children: any) {
        if (stringOutput) {
          return <div dangerouslySetInnerHTML={{ __html: stringOutput }} />;
        }

        function ContentForLayout({ children }: any) {
          const rootProps = useContext(RootContext);
          const { ContentSections }: any = rootProps;

          return ContentSections.map((Section: any, index: number) => (
            <Section.type {...Section.props} key={index} />
          ));
        }

        return React.createElement(ContentForLayout);
      },
    },
    {
      // Replace HTML tag with head and body elements
      shouldProcessNode: function (node: any) {
        return node.name === 'html';
      },
      processNode: function () {
        // TODO: try getting rid of this
        document.documentElement.setAttribute('class', 'js');

        const children = bodyItems.filter(
          (item: any) =>
            item && typeof item !== 'string' && React.isValidElement(item),
        );

        return React.createElement(ContentWrapper, {}, children);
      },
    },
    {
      // Process all other nodes
      shouldProcessNode: function () {
        return true;
      },
      processNode: processNodeDefinitions.processDefaultNode,
    },
  ];
}

function getPageBlockProcessingInstructions(Blocks: any) {
  let blockIndex = 0;
  return [
    {
      // Disable all external anchor links, and add editor property to internal links
      shouldProcessNode: function (node: any) {
        return node.name === 'a';
      },
      processNode: function (node: any, children: any, index: any) {
        let reg_ex = new RegExp('^(http|https)://', 'i');
        if (reg_ex.test(node.attribs.href)) {
          node.attribs.style = 'pointer-events: none; cursor: default;';
        } else {
          if (node.attribs.href) {
            node.attribs.href += node.attribs.href?.includes('?')
              ? '&_editor'
              : '?_editor';
          }
        }
        return processNodeDefinitions.processDefaultNode(node, children, index);
      },
    },
    {
      shouldProcessNode: function (node: any) {
        return node.attribs?.class === 'swell-block';
      },
      processNode: function (_node: any, children: any) {
        const Root = Blocks[blockIndex++];
        return React.createElement(Block, { Root }, children);
      },
    },
    {
      // Process all other nodes
      shouldProcessNode: function () {
        return true;
      },
      processNode: processNodeDefinitions.processDefaultNode,
    },
  ];
}

export function getEasyblocksComponents(swell: Swell, props: any) {
  const { themeGlobals } = props;

  const theme = initTheme(swell);

  theme.setGlobals(themeGlobals);

  if (themeGlobals?.shopify_compatibility) {
    theme.shopifyCompatibility = new StorefrontShopifyCompatibility(theme);
  }

  return getEasyblocksComponentDefinitions(props, (type: string, data: any) => {
    switch (type) {
      case 'pageSection':
        return getPageSectionComponent(props, theme, data);
      case 'layoutSectionGroup':
        return SectionGroup;
      case 'block':
        return Block;
      case 'root':
        return getRootComponent(props, theme);
      default:
        throw new Error(`Invalid component definition type: ${type}`);
    }
  });
}

export default function EasyblocksPage(props: any) {
  const {
    pageId,
    allSections,
    pageSections,
    layoutSectionGroups,
    swellClientProps,
    themeGlobals,
  } = props;
  const [easyblocksConfig, setEasyblocksConfig] = useState<any>(null);
  const [components, setComponents] = useState<any>(null);

  useEffect(() => {
    const swell = new Swell({ ...swellClientProps, isEditor: true });

    const components = getEasyblocksComponents(swell, props);
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
    return null;
  }

  return (
    <EasyblocksEditor
      config={easyblocksConfig}
      components={components}
      __debug={true}
      isCanvas={true}
    />
  );
}
