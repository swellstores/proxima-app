import { SwellAPI, SwellRecord } from "./api";

export async function getStorefrontSettings(): Promise<SwellRecord> {
  const swell = new SwellAPI();

  const settings = await swell.get("/clients/:self");

  return settings;
}

export async function getThemeSettings(): Promise<SwellRecord> {
  const swell = new SwellAPI();

  const settings = await swell.get("/theme-settings");

  return settings;
}
