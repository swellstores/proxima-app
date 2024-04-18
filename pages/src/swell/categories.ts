import { Swell, SwellStorefrontCollection, SwellStorefrontRecord } from './api';
import { getProducts } from './products';

export function getCategories(swell: Swell, query?: SwellData) {
  return new SwellStorefrontCollection(swell, 'categories', query);
}

export function getCategory(swell: Swell, id: string, query?: SwellData) {
  return new SwellStorefrontRecord(swell, 'categories', id, query);
}

export async function getCategoryWithProducts(
  swell: Swell,
  id: string,
  query?: SwellData,
): Promise<SwellStorefrontRecord> {
  const category = getCategory(swell, id, query);

  const categoryId = await category.id;

  category.products = getProducts(swell, { category: categoryId });

  return category;
}
