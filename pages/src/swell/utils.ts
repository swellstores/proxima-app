import reduce from "lodash/reduce";
import { ThemeSection, ThemeBlock, ThemeSectionGroup, ThemeSectionConfig } from "./liquid-next/types";
import { LANG_TO_COUNTRY_CODES } from "./constants";
//import util from "util";

export function dump(...args: any[]) {
  console.log(args);
  //args.forEach((arg) => console.log(util.inspect(arg, false, null, true)));
}

export function themeConfigQuery(swellHeaders: { [key: string]: any }): { [key: string]: any } {
  return {
    parent_id: swellHeaders["theme-id"],
    branch_id: swellHeaders["theme-branch-id"] || null,
    preview:
      swellHeaders["deployment-mode"] === "preview" ? true : { $ne: true },
  };
}

export async function getSectionGroupConfigs(sectionGroup: ThemeSectionGroup, getSchema: (type: string) => any): Promise<ThemeSectionConfig[]> {
  const order =
    sectionGroup.order instanceof Array
      ? sectionGroup.order
      : Object.keys(sectionGroup.sections || {});

  const sections = await Promise.all(
    order.map(
      (
        key: string,
      ): Promise<ThemeSectionConfig> => {
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
