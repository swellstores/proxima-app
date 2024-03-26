import { Swell, SwellStorefrontCollection, SwellStorefrontRecord } from './api';
import { getProducts } from './products';

export async function getCategories(
  swell: Swell,
  query?: SwellData,
): Promise<any> {
  return new SwellStorefrontCollection(swell, 'categories', query);
}

export async function getCategory(
  swell: Swell,
  id: string,
  query?: SwellData,
): Promise<any> {
  return new SwellStorefrontRecord(swell, 'categories', id, query);
}

export async function getCategoryWithProducts(
  swell: Swell,
  id: string,
  query?: SwellData,
): Promise<any> {
  const [category, products] = await Promise.all([
    getCategory(swell, id, query),
    getProducts(swell, { category: id }),
  ]);
  category.products = products;
  return category;
}
