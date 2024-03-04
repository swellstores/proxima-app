import { Swell } from "./api";

export async function getProducts(swell: Swell, query?: object): Promise<any> {
  return await swell.getCached("products", [query], () =>
    swell.storefront.products.list(query)
  );
}

export async function getProduct(
  swell: Swell,
  id: string,
  query?: object
): Promise<any> {
  return await swell.getCached("product", [id, query], () =>
    swell.storefront.products.get(id, query)
  );
}
