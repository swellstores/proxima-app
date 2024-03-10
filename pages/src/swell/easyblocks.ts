import get from "lodash/get";
import reduce from "lodash/reduce";
import { Swell } from "./api";
import { ThemeSectionConfig } from "./liquid-next/types";
import {
  Backend,
  Document,
  UserDefinedTemplate,
} from "@easyblocks/core";
import { themeConfigQuery, getSectionGroupConfigs } from "@/swell/utils";

export async function getThemeConfig(swell: Swell, themePath: string): Promise<any> {
  if (!swell.swellHeaders["theme-id"]) {
    return null;
  }
  const config = await swell.getCached("editor-theme-config", [themePath], async () => {
    return await swell.get("/:themes:configs/:last", {
      ...themeConfigQuery(swell.swellHeaders),
      file_path: `theme/${themePath}.json`,
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

  try {
    return JSON.parse(config.file_data);
  } catch {
    return null;
  }
}

export function renderLanguage(
  lang: any,
  key: string,
  defaultValue?: string,
): string {
  if (key === undefined) {
    return "";
  }

  const localeCode = /*String(this.globals?.store?.locale || "") ||*/ "en-US";
  const keyParts = key?.split(".") || [];
  const keyName = keyParts.pop() || "";
  const keyPath = keyParts.join(".");
  const langObject = get(lang, keyPath);

  const localeValue =
    get(langObject?.[localeCode], keyName) ||
    get(langObject?.[localeCode.split("-")[0]], keyName) ||
    langObject?.[keyName] ||
    defaultValue;

  if (typeof localeValue !== "string") {
    return "";
  }

  return localeValue;
}

export async function getEasyblocksPageProps(swell: Swell, pageId: string, lang: any) {
  const sectionGroup = await getThemeConfig(swell, `pages/${pageId}`);
  const sectionConfigs = await getSectionGroupConfigs(
    sectionGroup,
    (type) => getThemeConfig(swell, `sections/${type}`)
  );
  return getEasyblocksPagePropsWithConfigs(sectionConfigs, pageId, lang);
}

export function getEasyblocksPagePropsWithConfigs(sectionConfigs: ThemeSectionConfig[], pageId: string, lang: any) {
  const components = [
    {
      id: `page_${pageId}`,
      label: 'Page: ' + pageId,
      schema: [
        {
          prop: 'title',
          label: 'Title',
          type: 'string',
        },
        {
          prop: 'description',
          label: 'Description',
          type: 'string',
        },
        {
          prop: "Sections",
          type: "component-collection",
          required: true,
          accepts: sectionConfigs.map(({ section }: ThemeSectionConfig) => section.type),
        }
      ],
      styles: () => {
        return {
          styled: {
            Root: {},
          },
        };
      },
    },
    ...sectionConfigs.map(
      ({ section, schema }: ThemeSectionConfig) => {
        return {
          id: section.type,
          label: section.type,
          schema: [
            ...schema?.settings?.map((setting: any) => {
              return {
                prop: setting.id,
                label: setting.id, // TODO: figure out how to rework locales/..schema.json for settings
                ...schemaToEasyblocksProps(lang, setting.type),
              };
            })
          ],
          styles: () => {
            return {
              styled: {
                Root: {},
              },
            };
          },
        }
      }),
  ];

  const templates = [{
    id: `page_${pageId}`,
    entry: {
      _id: `page_${pageId}`,
      _component: `page_${pageId}`,
      Sections: sectionConfigs.map(({ section }: any) => ({
        _id: `${section.type}_${Math.random()}`,
        _component: section.type,
        ...reduce(section.settings, (acc, value, key) => ({
          ...acc,
          [key]: value
        }), {})
      }))
    }
  }];

  return {
    sectionConfigs,
    easyblocksConfig: {
      locales: [
        {
          code: "en-US",
          isDefault: true,
        },
      ],
      components,
      templates,
      tokens: {
        colors: [
          {
            id: "black",
            label: "Black",
            value: "#000000",
            isDefault: true,
          },
          {
            id: "white",
            label: "White",
            value: "#ffffff",
          },
          {
            id: "coral",
            label: "Coral",
            value: "#ff7f50",
          },
        ],
        fonts: [
          {
            id: "body",
            label: "Body",
            value: {
              fontSize: 18,
              lineHeight: 1.8,
              fontFamily: "sans-serif",
            },
            isDefault: true,
          },
          {
            id: "heading",
            label: "Heading",
            value: {
              fontSize: 24,
              fontFamily: "sans-serif",
              lineHeight: 1.2,
              fontWeight: 700,
            },
          },
        ],
        space: [
          {
            id: "0",
            label: "0",
            value: "0px",
            isDefault: true,
          },
          {
            id: "1",
            label: "1",
            value: "1px",
          },
          {
            id: "2",
            label: "2",
            value: "2px",
          },
          {
            id: "4",
            label: "4",
            value: "4px",
          },
          {
            id: "6",
            label: "6",
            value: "6px",
          },
          {
            id: "8",
            label: "8",
            value: "8px",
          },
          {
            id: "12",
            label: "12",
            value: "12px",
          },
          {
            id: "16",
            label: "16",
            value: "16px",
          },
          {
            id: "24",
            label: "24",
            value: "24px",
          },
          {
            id: "32",
            label: "32",
            value: "32px",
          },
          {
            id: "48",
            label: "48",
            value: "48px",
          },
          {
            id: "64",
            label: "64",
            value: "64px",
          },
          {
            id: "96",
            label: "96",
            value: "96px",
          },
          {
            id: "128",
            label: "128",
            value: "128px",
          },
          {
            id: "160",
            label: "160",
            value: "160px",
          },
        ],
      }
    },
  };
}

export function schemaToEasyblocksProps(lang: any, setting: any) {
  switch (setting?.type) {
    case "select":
      return {
        type: "select",
        options: setting.options?.map((option: any) => ({
          label: option.label?.startsWith('t:')
              ? renderLanguage(lang, option.label.split('t:')[1], option.label)
              : option.label,
          value: option.value,
        })),
      };

    case "checkbox":
      return {
        type: "boolean",
        defaultValue: setting.default,
      };

    // TODO: custom types
    case "image_picker":
    case "range":
    default:
      return {
        type: "string",
      };
  }
}

export function getEasyblocksBackend(sectionConfigs: ThemeSectionConfig[]) {
  // TODO: client-side methods for saving etc
  const easyblocksBackend: Backend = {
    documents: {
      get: async ({ id }) => {
        const document = {
          id,
          version: 1,
          entry: {
            _id: 'page',
            _component: `page_${id}`,
          }
        } as Document;
        console.log({ document })
        return document;
      },
      create: async (payload) => {
        console.log("create document", payload);
        return {} as Document;
      },
      update: async (payload) => {
        console.log("update document", payload);
        return {} as Document;
      },
    },
    templates: {
      get: async (payload) => {
        console.log("get template", payload);
        return {} as UserDefinedTemplate;
      },
      getAll: async () => {
        console.log("get all templates");
        return [] as UserDefinedTemplate[];
      },
      create: async (payload) => {
        console.log("create template", payload);
        return {} as UserDefinedTemplate;
      },
      update: async (payload) => {
        console.log("update template", payload);
        return {} as UserDefinedTemplate;
      },
      delete: async (payload) => {
        console.log("delete template", payload);
        return;
      },
    },
  };

  return easyblocksBackend
}