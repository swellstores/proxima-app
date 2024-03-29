import reduce from "lodash/reduce";
import { LANG_TO_COUNTRY_CODES } from "./constants";
import { has } from 'lodash';

export function themeConfigQuery(swellHeaders: { [key: string]: any }): {
  [key: string]: any;
} {
  return {
    parent_id: swellHeaders['theme-id'],
    branch_id: swellHeaders['theme-branch-id'] || null,
    preview:
      swellHeaders['deployment-mode'] === 'preview' ? true : { $ne: true },
  };
}

export async function getPageSections(
  allSections: SwellCollection,
  renderTemplateSchema: (config: any) => Promise<any>,
): Promise<ThemePageSectionSchema[]> {
  if (!allSections?.results) return [];

  const pageSectionConfigs = await Promise.all(
    allSections.results
      .filter((config: SwellRecord) => {
        if (!config.file_path?.startsWith('theme/sections/')) return false;
        const isLiquidFile = config.file_path.endsWith('.liquid');
        const isJsonFile = config.file_path.endsWith('.json');

        if (isLiquidFile) {
          const hasJsonFile = allSections.results.find(
            (c: any) =>
              c.file_path === config.file_path.replace(/\.liquid$/, '.json'),
          );
          if (!hasJsonFile) {
            return true;
          }
        } else if (isJsonFile) {
          return true;
        }
      })
      .map(async (config: SwellRecord) => {
        let schema;

        // Extract {% schema %} from liquid files for Shopify compatibility
        if (config?.file_path?.endsWith('.liquid')) {
          schema = await renderTemplateSchema(config);
        } else {
          try {
            schema = JSON.parse(config.file_data);
          } catch {
            schema = {};
          }
        }

        return {
          ...schema,
          id: config.name.split('.').pop(),
        };
      }),
  );

  return pageSectionConfigs;
}

export async function getLayoutSectionGroups(allSections: SwellCollection): Promise<ThemeLayoutSectionGroupSchema[]> {
  if (!allSections?.results) return [];

  const sectionGroupConfigs = allSections.results.filter(
    (config: SwellRecord) =>
      config.file_path?.endsWith('.json')
      // Section groups must not have a liquid file
      && !allSections.results.find((c: SwellRecord) => c.file_path === config.file_path.replace(/\.json$/, '.liquid')),
  );

  const getSectionSchema = async (type: string): Promise<ThemeSectionSchema | undefined> => {
    const config = allSections.results.find(
      (config: SwellRecord) =>
        config.file_path?.endsWith(`${type}.json`)
    );
    try {
      return {
        ...(JSON.parse(config?.file_data) || undefined),
        id: config?.name.split('.').pop(),
      };
    } catch {
      // noop
    }
  };

  return await Promise.all(
    sectionGroupConfigs.map((config: SwellRecord): Promise<ThemeLayoutSectionGroupSchema> => {
      return new Promise(async (resolve: any) => {
        let sectionGroup;
        try {
          sectionGroup = JSON.parse(config.file_data);
        } catch {
          // noop
        }
        // Must have a type property
        if (sectionGroup?.type) {
          const sectionConfigs = await getSectionGroupConfigs(sectionGroup, getSectionSchema)
          resolve({
            ...sectionGroup,
            id: config.name.split('.').pop(),
            sectionConfigs,
          });
        } else {
          resolve();
        }
      });
    })
  ).then((result: any[]) => result.filter(Boolean));
}

export async function getSectionGroupConfigs(
  sectionGroup: ThemeSectionGroup | SwellRecord,
  getSchema: (type: string) => Promise<ThemeSectionSchema | undefined>
): Promise<ThemeSectionGroupConfig[]> {
  const order =
    sectionGroup.order instanceof Array
      ? sectionGroup.order
      : Object.keys(sectionGroup.sections || {});

  const sections = await Promise.all(
    order.map(
      (
        key: string,
      ): Promise<ThemeSectionGroupConfig> => {
        return new Promise(async (resolve) => {
          const section: ThemeSection = sectionGroup.sections[key];

          const blockOrder =
            section.block_order instanceof Array
              ? section.block_order
              : Object.keys(section.blocks || {});

          const blocks: ThemeBlock[] = await Promise.all(
            blockOrder.map((key: string) => section.blocks[key]),
          );

          const schema = await getSchema(section.type);

          const settings = {
            section: {
              ...section,
              blocks,
            },
          };

          resolve({
            id: key,
            section,
            schema,
            settings,
            tag: schema?.tag || "div",
            class: schema?.class,
          });
        });
      },
    ),
  );

  return sections;
}

export function isArray(value: any) {
  // be compatible with IE 8
  return String(value) === "[object Array]";
}

export function isObject(value: any) {
  const type = typeof value;
  return value !== null && (type === "object" || type === "function");
}

export function toBase64(inputString: string): string {
  const utf8Bytes = new TextEncoder().encode(inputString);
  let base64String = "";

  for (let i = 0; i < utf8Bytes.length; i += 3) {
    const chunk = Array.from(utf8Bytes.slice(i, i + 3));
    base64String += btoa(String.fromCharCode(...chunk));
  }

  return base64String;
}

export function arrayToObject(arr: Array<any>, key = "id") {
  return reduce(
    arr,
    (obj: { [key: string]: any }, value) => {
      obj[value[key]] = value;
      return obj;
    },
    {},
  );
}

export function getCountryCodeFromLocale(locale: string): string {
  const split = locale.toUpperCase().split(/-|_/);
  const lang = split.shift() as string;
  const country = split.pop();
  let code = "";

  if (country) code = country;
  if (!country) code = LANG_TO_COUNTRY_CODES[lang.toLowerCase()] || "";

  return code.toLowerCase();
}
