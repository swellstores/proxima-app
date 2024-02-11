import { SwellAPI, getSwellHeaders } from "./api";

let THEME_CONFIGS: { [key: string]: any } = {};

// NOTE: this approach should be replaced with KV fetch
// instead of making a request to the API and caching in local memory
export async function getThemeConfigs(Astro: any): Promise<any> {
  const swellHeaders = await getSwellHeaders(Astro);

  if (!swellHeaders["theme-id"]) {
    return null;
  }

  const themeKey = `${swellHeaders["theme-id"]}|${swellHeaders["theme-branch-id"]}|${swellHeaders["deployment-mode"]}`;

  if (THEME_CONFIGS[themeKey]) {
    return THEME_CONFIGS[themeKey];
  }

  const swell = new SwellAPI();

  const configs = await swell.get("/:themes:configs", {
    parent_id: swellHeaders["theme-id"],
    branch_id: swellHeaders["theme-branch-id"] || null,
    preview:
      swellHeaders["deployment-mode"] === "preview" ? true : { $ne: true },
    limit: 1000,
    fields: "type, name, file_path, file_data",
    include: {
      fileData: {
        url: "/:themes:configs/{id}/file/data",
      },
    },
  });

  THEME_CONFIGS[themeKey] = configs;

  return configs;
}

export async function getThemeTemplate(Astro: any, filePath: string): Promise<any> {
  const configs = await getThemeConfigs(Astro);
  const templateConfig = configs?.results.find(
    (config: any) => config.file_path === filePath
  );

  return templateConfig;
}

export async function getThemeTemplateValue(Astro: any, filePath: string): Promise<any> {
  const config = await getThemeTemplate(Astro, filePath);

  if (config?.name?.endsWith(".json")) {
    try {
      return JSON.parse(config.fileData);
    } catch (err) {
      return null;
    }
  }

  return config?.fileData || null;
}
