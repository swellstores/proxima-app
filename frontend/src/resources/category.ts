import {
  Swell,
  SwellData,
  StorefrontResource,
  SwellCategory,
  SwellStorefrontRecord,
  SwellStorefrontCollection,
} from '@swell/apps-sdk';

import { getProductFilters } from './product';

export class CategoryResource extends SwellCategory {
  constructor(swell: Swell, slug: string, query: SwellData = {}) {
    super(swell, slug, query, async (): Promise<any> => {
      const category = new SwellStorefrontRecord(
        swell,
        'categories',
        slug,
        query,
      );

      await category.id;

      if (!category.id && slug !== 'all') {
        return null; // Not found
      }

      const categoryFilter = category.id || (slug === 'all' ? undefined : slug);
      const productFilters = await getProductFilters(
        swell,
        categoryFilter
          ? { category: categoryFilter, $variants: true }
          : { $variants: true },
      );

      return {
        ...(category.id
          ? category._result
          : // TODO: remove this once backend is implemented for "all"
            { name: 'Products', id: 'all', slug: 'all' }),
        ...productFilters,
      };
    });
  }
}

export class CategoriesResource extends StorefrontResource {
  constructor(swell: Swell, query: SwellData = {}) {
    super(async () => {
      const categories = new SwellStorefrontCollection(swell, 'categories', {
        limit: 100,
        top_id: null,
        ...query,
      });

      const results = (await categories.results) ?? [];

      for (const category of results) {
        category.products = new SwellStorefrontCollection(swell, 'products', {
          category: category.id,
        });
      }

      return categories._result;
    });
  }
}
