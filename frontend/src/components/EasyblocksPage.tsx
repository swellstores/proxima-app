import React, {
  useMemo,
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

const ContentWrapper = React.memo(function ContentWrapper({ children }: any) {
  return <Fragment>{children}</Fragment>;
});

const LayoutSectionGroup = React.memo(function LayoutSectionGroup({ Root, Sections }: any) {
  return (
    <Root.type {...Root.props}>
      {Sections.map((Section: any, index: number) => (
        <Section.type {...Section.props} key={index} />
      ))}
    </Root.type>
  );
});

const Block = React.memo(function Block({ Root, children }: any) {
  return <Root.type {...Root.props}>{children}</Root.type>;
});

const RootContext = createContext(null);

function getRootComponent(props: any, theme: SwellTheme) {
  const { layoutProps, pageProps, pageContent } = props;

  return React.memo(function RootContainer(props: any) {
    const { Root } = props;

    const [Content, setContent] = useState(() => <div />);

    const editorSchema = pageProps.configs?.editor?.settings;

    const settings = useMemo(
      () => {
        const settingProps = getThemeSettingsFromProps(props, editorSchema);

        return resolveThemeSettings(theme, settingProps, editorSchema);
      },
      [props, editorSchema],
    );

    useEffect(() => {
      console.log('render layout', { settings });

      theme.setGlobals({ settings });

      theme
        .renderLayout({
          ...layoutProps,
          content_for_header: theme.getContentForHeader(),
          content_for_layout: '<content-for-layout></content-for-layout>',
        })
        .then(async (output) => {
          // Render theme page directly when it's a raw liquid file
          const stringOutput =
            typeof pageContent === 'string'
              ? await theme.renderTemplateString(pageContent, pageProps)
              : undefined;

          const RootElements = htmlToReactParser.parseWithInstructions(
            output,
            isValidNode,
            getLayoutProcessingInstructions(stringOutput),
          );

          const Content = RootElements.find(
            (element: any) => element.type === ContentWrapper,
          ) || {
            type: () => (
              // TODO: nicer UI for rendering this error
              <div>Theme layout is missing a valid &lt;html&gt; tag</div>
            ),
            props: {},
          };

          setContent(Content);
        });
    }, [theme.liquidSwell.layoutName, settings]);

    return (
      <Root.type {...Root.props}>
        <RootContext.Provider value={props}>
          <Content.type {...Content.props} />
        </RootContext.Provider>
      </Root.type>
    );
  });
}

function getPageSectionComponent(
  theme: SwellTheme,
  sectionSchema: any,
) {
  return React.memo(function Section(props: any) {
    const { Root, Blocks } = props;
    const [SectionElements, setOutput] = useState(null);

    const sectionData = useMemo(() => {
      const settingProps = getSectionSettingsFromProps(props, sectionSchema);
  
      return resolveSectionSettings(theme, {
        settings: { section: settingProps },
        schema: sectionSchema,
      });
    }, [props]);

    useEffect(() => {
      console.log('render section', sectionSchema.id, sectionData);

      theme
        .renderThemeTemplate(
          `theme/sections/${sectionSchema.id}.liquid`,
          sectionData,
        )
        .then((output) => {
          const SectionElements = htmlToReactParser.parseWithInstructions(
            output,
            isValidNode,
            getPageBlockProcessingInstructions(Blocks),
          );

          setOutput(SectionElements);
        });
    }, [sectionData]);

    return <Root.type {...Root.props}>{SectionElements}</Root.type>;
  });
}

const SectionGroup = React.memo(function SectionGroup(props: any) {
  const rootProps = useContext(RootContext) as any;

  const sectionGroupId = props.id?.split('__').pop();

  const SectionGroupSections =
    rootProps[`SectionGroup_${sectionGroupId}`];

  return (
    <div className={props.class} id={props.id}>
      {Array.isArray(SectionGroupSections) &&
        SectionGroupSections.map((Section: any, index: number) => (
          <Section.type {...Section.props} key={index} />
        ))}
    </div>
  );
});

const ContentForLayout = React.memo(function ContentForLayout({ children }: any) {
  const rootProps: any = useContext(RootContext);
  const { ContentSections } = rootProps;

  return ContentSections.map((Section: any, index: number) => (
    <Section.type {...Section.props} key={index} />
  ));
});

function getLayoutProcessingInstructions(stringOutput?: string) {
  let bodyItems: any;

  return [
    {
      // Replace layout group sections with the actual components
      shouldProcessNode: function (node: any) {
        return node.attribs?.class?.startsWith?.('swell-section-group');
      },
      processNode: function (node: any, _children: any, index: number) {
        return React.createElement(SectionGroup, { ...node.attribs, key: index });
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
      processNode: function (_node: any, _children: any, index: number) {
        if (stringOutput) {
          return <div key={index} dangerouslySetInnerHTML={{ __html: stringOutput }} />;
        }

        return React.createElement(ContentForLayout, { key: index });
      },
    },
    {
      // Replace HTML tag with head and body elements
      shouldProcessNode: function (node: any) {
        return node.name === 'html';
      },
      processNode: function (_node: any, _children: any, index: number) {
        // TODO: try getting rid of this
        document.documentElement.setAttribute('class', 'js');

        const children = bodyItems.filter(
          (item: any) =>
            item && typeof item !== 'string' && React.isValidElement(item),
        );

        return React.createElement(ContentWrapper, { key: index }, children);
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

const LINK_REGEX = /^(http|https):\/\//i;

const REPLACE_PROPS = Object.freeze([
  ['value', 'defaultValue'],
  ['onload', 'onLoad'],
]);

function getPageBlockProcessingInstructions(Blocks: any) {
  let blockIndex = 0;

  return [
    {
      // Disable all external anchor links, and add editor property to internal links
      shouldProcessNode: function (node: any) {
        return node.name === 'a';
      },
      processNode: function (node: any, children: any, index: number) {
        if (LINK_REGEX.test(node.attribs.href)) {
          node.attribs.style = 'pointer-events: none; cursor: default;';
        } else {
          if (node.attribs.href) {
            node.attribs.href += node.attribs.href.includes('?')
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
      processNode: (node: any, children: any, index: number) => {
        if (node.attribs) {
          // Replace props for react components
          for (const [src, dest] of REPLACE_PROPS) {
            if (Object.hasOwn(node.attribs, src)) {
              node.attribs[dest] = node.attribs[src];
              delete node.attribs[src];
            }
          }
        }

        return processNodeDefinitions.processDefaultNode(node, children, index);
      },
    },
  ];
}

export function getEasyblocksComponents(swell: Swell, props: any) {
  const { themeGlobals, allSections, layoutSectionGroups } = props;

  const theme = initTheme(swell);

  theme.setGlobals(themeGlobals);

  if (themeGlobals?.shopify_compatibility) {
    theme.shopifyCompatibility = new StorefrontShopifyCompatibility(theme);
  }

  return getEasyblocksComponentDefinitions(allSections, layoutSectionGroups, (type: string, data: any) => {
    switch (type) {
      case 'pageSection':
        return getPageSectionComponent(theme, data);
      case 'layoutSectionGroup':
        return LayoutSectionGroup;
      case 'block':
        return Block;
      case 'root':
        return getRootComponent(props, theme);
      default:
        throw new Error(`Invalid component definition type: ${type}`);
    }
  });
}

function EasyblocksPage(props: any) {
  const {
    pageId,
    allSections,
    pageSections,
    layoutSectionGroups,
    swellClientProps,
    themeGlobals,
  } = props;

  const easyblocksConfig = useMemo(() => {
    const { easyblocksConfig } = getEasyblocksPagePropsWithConfigs(
      themeGlobals,
      allSections,
      pageSections,
      layoutSectionGroups,
      pageId,
    );

    return easyblocksConfig;
  }, [pageId, themeGlobals, allSections, pageSections, layoutSectionGroups]);

  const swell = useMemo(() => {
    return new Swell({ ...swellClientProps, isEditor: true });
  }, [swellClientProps]);

  const components = useMemo(() => {
    return getEasyblocksComponents(swell, props);
  }, [props, swell]);

  return (
    <EasyblocksEditor
      config={easyblocksConfig}
      components={components}
      __debug={true}
      isCanvas={true}
    />
  );
}

export default React.memo(EasyblocksPage);
