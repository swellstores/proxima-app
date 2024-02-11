import { swellStorefront } from "./api";

export async function getProducts(query?: object): Promise<any> {
  const products = await swellStorefront.products.list(query);

  return products;
}
