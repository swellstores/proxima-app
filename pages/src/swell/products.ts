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

export async function getProductsFiltered(
  swell: Swell,
  {
    search,
    filter,
    sort,
  }: {
    search?: string | null;
    filter?: any;
    sort?: string | null;
  },
): Promise<any> {
  return new SwellStorefrontCollection(swell, 'products', {
    search,
    filter,
    sort,
  });
}