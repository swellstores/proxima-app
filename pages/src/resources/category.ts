import {
  Swell,
  SwellStorefrontRecord,
  SwellStorefrontCollection,
} from '@swell/storefrontjs';
import { getFilteredProducts } from './filterable-products';
import { Category } from 'swell-js';

export default function getCategoryResource(
  swell: Swell,
  slug: string,
  query: SwellData = {},
) {
  return new CategoryResource(
    swell,
    slug,
    query,
  ) as any as SwellStorefrontRecord & Category;
}

export class CategoryResource extends SwellStorefrontRecord {
  constructor(swell: Swell, slug: string, query: SwellData = {}) {
    super(swell, 'categories', slug, query, async () => {
      const category = new SwellStorefrontRecord(
        swell,
        'categories',
        slug,
        query,
      );

      await category.id;
      const categoryId = category.id || (slug === 'all' ? undefined : slug);

      const filteredProps = await getFilteredProducts(
        swell,
        categoryId
          ? {
              category: categoryId,
            }
          : {},
      );

      return {
        ...(category.id
          ? category._result
          : // TODO: remove this once backend is implemented for "all"
            { name: 'Products', slug: 'all' }),
        ...filteredProps,
      };
    });
  }
}
