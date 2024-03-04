import { Swell } from "./api";

export async function getCategories(
  swell: Swell,
  query?: object
): Promise<any> {
  return await swell.getCached("categories", [query], () =>
    swell.storefront.categories.list(query)
  );
}

export async function getCategory(
  swell: Swell,
  id: string,
  query?: object
): Promise<any> {
  return await swell.getCached("category", [id, query], () =>
    swell.storefront.categories.get(id, query)
  );
}
