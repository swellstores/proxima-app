import { Swell, SwellStorefrontCollection, SwellStorefrontRecord } from './api';

export async function getProducts(
  swell: Swell,
  query?: SwellData,
): Promise<any> {
  return new SwellStorefrontCollection(swell, 'products', query);
}

export async function getProduct(
  swell: Swell,
  id: string,
  query?: SwellData,
): Promise<any> {
  return new SwellStorefrontRecord(swell, 'products', id, query);
}
