import get from "lodash/get";
import reduce from "lodash/reduce";
import { Swell } from "./api";

import {
  Backend,
  Document,
  UserDefinedTemplate,
} from "@easyblocks/core";
import { themeConfigQuery } from "@/swell/utils";

export async function getThemeConfig(swell: Swell, themePath: string): Promise<SwellRecord | null> {
  if (!swell.swellHeaders["theme-id"]) {
    return null;
  }

  const config = await swell.getCached("editor-theme-config", [themePath], async () => {
    return await swell.get("/:themes:configs/:last", {
      ...themeConfigQuery(swell.swellHeaders),
      file_path: `theme/${themePath}.json`,
      fields: "type, name, file, file_path, file_data",
      include: {
        file_data: {
          url: "/:themes:configs/{id}/file/data",
          conditions: {
            type: "theme",
          },
        },
      },
    });
  });

  try {
    return JSON.parse(config.file_data);
  } catch {
    return null;
  }
}

export async function getThemeSectionConfigs(swell: Swell): Promise<SwellCollection> {
  const configs = await swell.getCached("editor-theme-section-configs", async () => {
    return await swell.get("/:themes:configs", {
      ...themeConfigQuery(swell.swellHeaders),
      file_path: { $regex: "^theme/sections/" },
      limit: 1000,
      fields: "type, name, file, file_path, file_data",
      include: {
        file_data: {
          url: "/:themes:configs/{id}/file/data",
          conditions: {
            type: "theme",
          },
        },
      },
    });
  });

  return configs;
}

export async function getEditorLanguageConfig(swell: Swell) {
  let editorLang = await getThemeConfig(swell, `config/language-editor`);
  
  // Fallback to shopify theme locales
  // TODO: put this logic in ShopifyCompatibility class
  if (!editorLang) {
    const storefrontSettings = await swell.getStorefrontSettings();
    const localeCode = storefrontSettings?.locale || "en-US";
    editorLang = await getThemeConfig(swell, `locales/${localeCode}.schema`);
    if (!editorLang) {
      const localeBaseCode = (localeCode as string).split("-")[0];
      editorLang = await getThemeConfig(swell, `locales/${localeBaseCode}.schema`);
    }
  }

  return editorLang;
}

export function renderLanguage(lang: any, key: string): string {
  if (key === undefined) {
    return '';
  }

  const localeCode = /*String(this.globals?.store?.locale || "") ||*/ 'en-US';
  const keyParts = key?.split('.') || [];
  const keyName = keyParts.pop() || '';
  const keyPath = keyParts.join('.');
  const langObject = get(lang, keyPath);

  const localeValue =
    get(langObject?.[localeCode], keyName) ||
    get(langObject?.[localeCode.split('-')[0]], keyName) ||
    langObject?.[keyName];

  if (typeof localeValue !== 'string') {
    return '';
  }

  return localeValue;
}

export function getEasyblocksPagePropsWithConfigs(
  sectionConfigs: ThemeSectionGroupConfig[],
  pageSections: any[],
  layoutSectionGroups: any[],
  pageId: string,
  lang: any,
) {
  const translateLabel = (label: string, fallback: string) => {
    return label?.startsWith('t:')
      ? renderLanguage(lang, label.split('t:')[1]) || fallback
      : fallback;
  };

  const getLayoutSectionGroupComponentProps = () => {
    return layoutSectionGroups.map((sectionGroup: any) => ({
      prop: `SectionGroup_${sectionGroup.id}`,
      type: 'component-collection',
      required: true,
      accepts: getAcceptedLayoutSections(sectionGroup.type),
    }));
  };

  const checkEnabledDisabledOn = (
    config: any,
    key: string,
    targetId: string,
  ) => {
    if (config.templates === '*') {
      return true;
    }
    if (config[key]?.includes(targetId)) {
      return true;
    }
    return false;
  };

  const getAcceptedPageSections = () => {
    return pageSections
      .reduce((acc: any, section: any) => {
        if (section.enabled_on) {
          if (checkEnabledDisabledOn(section.enabled_on, 'templates', pageId)) {
            acc.push(section.id);
          }
        } else if (section.disabled_on) {
          if (
            !checkEnabledDisabledOn(section.disabled_on, 'templates', pageId)
          ) {
            acc.push(section.id);
          }
        } else {
          // Default hide sections named after layout section group types
          if (
            !layoutSectionGroups
              .map(({ type }: any) => type)
              .includes(section.id)
          ) {
            acc.push(section.id);
          }
        }
        return acc;
      }, [])
      .map((sectionId: string) => `${sectionId}`);
  };

  const getAcceptedLayoutSections = (groupType: string) => {
    return pageSections
      .reduce((acc: any, section: any) => {
        if (section.enabled_on) {
          if (checkEnabledDisabledOn(section.enabled_on, 'groups', groupType)) {
            acc.push(section.id);
          }
        } else if (section.disabled_on) {
          if (
            !checkEnabledDisabledOn(section.disabled_on, 'groups', groupType)
          ) {
            acc.push(section.id);
          }
        } else {
          // Default to section of the same type name
          // Note: limit is also supposed to be 1 for sections named after group types
          if (section.id === groupType) {
            acc.push(section.id);
          }
        }
        return acc;
      }, [])
      .map((sectionId: string) => `${sectionId}`);
  };

  console.log({ pageSections, layoutSectionGroups });

  const components = [
    {
      id: `page_${pageId}`,
      label: 'Page: ' + pageId,
      schema: [
        {
          prop: 'ContentSections',
          type: 'component-collection',
          required: true,
          accepts: getAcceptedPageSections(),
          placeholderAppearance: {
            height: 250,
            label: 'Add section',
            aspectRatio: 1,
          },
        },
        ...getLayoutSectionGroupComponentProps(),
      ],
      styles: () => {
        return {
          styled: {
            Root: {},
          },
        };
      },
    },
    ...pageSections.map((section: any) => {
      return {
        id: `${section.id}`,
        label: translateLabel(section.name, section.id),
        schema: [
          ...(section.settings || [])
            .map((setting: any) => {
              if (!setting.id || !setting.type) return;
              return {
                prop: setting.id,
                label: translateLabel(setting.label, setting.id),
                defaultValue: setting.default,
                ...schemaToEasyblocksProps(lang, setting),
              };
            })
            .filter(Boolean),
          ...(section?.blocks
            ? [
                {
                  prop: 'Blocks',
                  type: 'component-collection',
                  required: true,
                  accepts: section.blocks.map(
                    (block: any) => `Block__${section.id}__${block.type}`,
                  ),
                  // TODO: figure out how to make this work, doesn't work for collections normally
                  defaultValue: section.presets?.[0]?.blocks?.map(
                    (block: any) => {
                      const blockDef = section.blocks.find(
                        ({ type }: any) => type === block.type,
                      );
                      if (!blockDef) return;
                      return {
                        _component: `Block__${section.id}__${block.type}`,
                        ...reduce(
                          blockDef.settings,
                          (acc, blockSetting) => ({
                            ...acc,
                            [blockSetting.id]: schemaToEasyblocksValue(
                              blockDef.settings,
                              blockSetting.id,
                              blockSetting.default,
                            ),
                          }),
                          {},
                        ),
                      };
                    },
                  ),
                  placeholderAppearance: {
                    height: 50,
                    label: 'Add block',
                    aspectRatio: 1,
                  },
                },
              ]
            : []),
        ],
        styles: () => {
          return {
            styled: {
              Root: {},
            },
          };
        },
      };
    }),
    ...pageSections.reduce((acc: any[], section: any) => {
      if (section.blocks) {
        acc.push(
          ...section.blocks.map((block: any) => ({
            id: `Block__${section.id}__${block.type}`,
            label: translateLabel(block.name, block.type),
            schema: [
              ...(block.settings || [])
                .map((setting: any) => {
                  if (!setting.id || !setting.type) return;
                  return {
                    prop: setting.id,
                    label: translateLabel(setting.label, setting.id),
                    defaultValue: setting.default,
                    ...schemaToEasyblocksProps(lang, setting),
                  };
                })
                .filter(Boolean),
            ],
            styles: () => {
              return {
                styled: {
                  Root: {},
                },
              };
            },
          })),
        );
      }
      return acc;
    }, []),
  ];

  const getSectionGroupTemplateValues = () => {
    return layoutSectionGroups.reduce(
      (acc: any, sectionGroup: any) => ({
        ...acc,
        [`SectionGroup_${sectionGroup.id}`]: sectionGroup.sectionConfigs.map(
          ({ section, settings, schema }: any) => ({
            _id: `SectionGroup__${section.type}_${Math.random()}`,
            _component: `${section.type}`,
            ...reduce(
              section.settings,
              (acc, value, key) => ({
                ...acc,
                [key]: schemaToEasyblocksValue(schema?.settings, key, value),
              }),
              {},
            ),
            ...(settings.section.blocks
              ? {
                  Blocks: settings.section.blocks.map((block: any) => ({
                    _id: `Block__${section.type}__${block.type}_${Math.random()}`,
                    _component: `Block__${section.type}__${block.type}`,
                    ...reduce(
                      block.settings,
                      (acc, value, key) => ({
                        ...acc,
                        [key]: schemaToEasyblocksValue(
                          schema?.blocks.find(
                            ({ type }: any) => type === block.type,
                          )?.settings,
                          key,
                          value,
                        ),
                      }),
                      {},
                    ),
                  })),
                }
              : {}),
          }),
        ),
      }),
      {},
    );
  };

  const templates = [
    {
      id: `page_${pageId}`,
      entry: {
        _id: `page_${pageId}`,
        _component: `page_${pageId}`,
        ContentSections: sectionConfigs.map(
          ({ section, settings, schema }: any) => ({
            _id: `${section.type}_${Math.random()}`,
            _component: `${section.type}`,
            ...reduce(
              section.settings,
              (acc, value, key) => ({
                ...acc,
                [key]: schemaToEasyblocksValue(schema?.settings, key, value),
              }),
              {},
            ),
            ...(settings.section.blocks
              ? {
                  Blocks: settings.section.blocks.map((block: any) => ({
                    _id: `Block__${section.type}__${block.type}_${Math.random()}`,
                    _component: `Block__${section.type}__${block.type}`,
                    ...reduce(
                      block.settings,
                      (acc, value, key) => ({
                        ...acc,
                        [key]: schemaToEasyblocksValue(
                          schema?.blocks.find(
                            ({ type }: any) => type === block.type,
                          )?.settings,
                          key,
                          value,
                        ),
                      }),
                      {},
                    ),
                  })),
                }
              : {}),
          }),
        ),
        ...getSectionGroupTemplateValues(),
      },
    },
  ];

  console.log({ components, templates });

  return {
    sectionConfigs,
    easyblocksConfig: {
      hideCloseButton: true,
      allowSave: true,
      locales: [
        {
          code: 'en-US',
          isDefault: true,
        },
      ],
      components,
      templates,
      tokens: {
        // Note these are just examples, would actually need to transform from theme settings I guess
        colors: [
          {
            id: 'black',
            label: 'Black',
            value: '#000000',
            isDefault: true,
          },
          {
            id: 'white',
            label: 'White',
            value: '#ffffff',
          },
          {
            id: 'coral',
            label: 'Coral',
            value: '#ff7f50',
          },
        ],
        fonts: [
          {
            id: 'body',
            label: 'Body',
            value: {
              fontSize: 18,
              lineHeight: 1.8,
              fontFamily: 'sans-serif',
            },
            isDefault: true,
          },
          {
            id: 'heading',
            label: 'Heading',
            value: {
              fontSize: 24,
              fontFamily: 'sans-serif',
              lineHeight: 1.2,
              fontWeight: 700,
            },
          },
        ],
        space: [
          {
            id: '0',
            label: '0',
            value: '0px',
            isDefault: true,
          },
          {
            id: '1',
            label: '1',
            value: '1px',
          },
          {
            id: '2',
            label: '2',
            value: '2px',
          },
          {
            id: '4',
            label: '4',
            value: '4px',
          },
          {
            id: '6',
            label: '6',
            value: '6px',
          },
          {
            id: '8',
            label: '8',
            value: '8px',
          },
          {
            id: '12',
            label: '12',
            value: '12px',
          },
          {
            id: '16',
            label: '16',
            value: '16px',
          },
          {
            id: '24',
            label: '24',
            value: '24px',
          },
          {
            id: '32',
            label: '32',
            value: '32px',
          },
          {
            id: '48',
            label: '48',
            value: '48px',
          },
          {
            id: '64',
            label: '64',
            value: '64px',
          },
          {
            id: '96',
            label: '96',
            value: '96px',
          },
          {
            id: '128',
            label: '128',
            value: '128px',
          },
          {
            id: '160',
            label: '160',
            value: '160px',
          },
        ],
      },
    },
  };
}

export function schemaToEasyblocksProps(lang: any, setting: any) {
  const sharedProps = {
    description: setting.description || setting.info,
  };

  let typeProps;
  switch (setting?.type) {
    case 'text':
    case 'short_text':
    // Note these need a different component:
    case 'textarea':
    case 'long_text':
    case 'basic_html':
    case 'rich_text':
    case 'rich_html':
    case 'markdown':
    case 'liquid':
      typeProps = {
        //type: "text"
        type: 'string',
      };
      break;

    case 'range':
    case 'number':
      typeProps = {
        type: 'number',
      };
      break;

    case 'select':
      typeProps = {
        type: 'select',
        params: {
          options: setting.options?.map((option: any) => ({
            label: option.label?.startsWith('t:')
              ? renderLanguage(lang, option.label.split('t:')[1]) ||
                option.label
              : option.label,
            value: option.value,
          })),
        },
      };
      break;

    case 'radio':
      typeProps = {
        type: 'radio-group',
        params: {
          options: setting.options?.map((option: any) => ({
            label: option.label?.startsWith('t:')
              ? renderLanguage(lang, option.label.split('t:')[1]) ||
                option.label
              : option.label,
            value: option.value,
          })),
        },
      };
      break;

    case 'checkbox':
      typeProps = {
        type: 'boolean',
        defaultValue: setting.default,
      };
      break;

    case 'color':
      typeProps = {
        type: 'color',
      };
      break;

    // TODO: custom types
    case 'image':
    case 'document':
    case 'video':
    case 'color_scheme':
    case 'color_schema_group':
    default:
      typeProps = {
        type: 'string',
      };
      break;
  }

  return {
    ...sharedProps,
    ...typeProps,
  };
}

export function getEasyblocksComponentDefinitions(
  props: any,
  pageId: string,
  getComponent: (type: string, data?: any) => any,
) {
  const { pageSections, layoutSectionGroups } = props;

  const pageSectionComponents = pageSections.reduce(
    (acc: any, section: any) => {
      acc[`${section.id}`] = getComponent('pageSection', section);
      return acc;
    },
    {},
  );

  const layoutSectionGroupComponents = layoutSectionGroups.reduce(
    (acc: any, sectionGroup: any) => {
      acc[`SectionGroup___${sectionGroup.id}`] = getComponent(
        'layoutSectionGroup',
        sectionGroup,
      );
      return acc;
    },
    {},
  );

  const blockComponents = pageSections.reduce((acc: any[], section: any) => {
    if (section.blocks) {
      for (const block of section.blocks) {
        const blockId = `Block__${section.id}__${block.type}` as any;
        acc[blockId] = getComponent('block', { section, block });
      }
    }
    return acc;
  }, {});

  return {
    ...pageSectionComponents,
    ...layoutSectionGroupComponents,
    ...blockComponents,
    // Root component
    [`page_${pageId}`]: getComponent('root'),
  };
}

export function schemaToEasyblocksValue(
  settings: any,
  settingId: string,
  value: any,
) {
  const setting = settings?.find?.((setting: any) => setting.id === settingId);
  switch (setting?.type) {
    // Note this should work for type "text" but it doesn't
    /* case "text":
    // Note these need a different component:
    case "textarea":
      console.log('schemaToEasyblocksValue text!', settings, settingId, value)
      return {
        id: Math.random().toString(),
        value: {
          ['en-US']: value || "",
        },
        widgetId: "@easyblocks/local-text"
      } */
    default:
      return value;
  }
}

export function getEasyblocksBackend(
  sectionConfigs: ThemeSectionGroupConfig[],
) {
  const easyblocksBackend: Backend = {
    documents: {
      get: async ({ id }) => {
        const document = {
          id,
          version: 1,
          entry: {
            _id: 'page',
            _component: `page_${id}`,
          },
        } as Document;
        return document;
      },
      create: async (payload) => {
        return {} as Document;
      },
      update: async (payload) => {
        return {} as Document;
      },
    },
    templates: {
      get: async (payload) => {
        return {} as UserDefinedTemplate;
      },
      getAll: async () => {
        return [] as UserDefinedTemplate[];
      },
      create: async (payload) => {
        return {} as UserDefinedTemplate;
      },
      update: async (payload) => {
        return {} as UserDefinedTemplate;
      },
      delete: async (payload) => {
        return;
      },
    },
  };

  return easyblocksBackend;
}