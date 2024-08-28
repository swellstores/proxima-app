import {
  Swell,
  StorefrontResource,
  SwellStorefrontRecord,
  SwellStorefrontCollection,
} from '@swell/apps-sdk';
import { getFilteredProducts } from './product';

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

      if (!category.id && slug !== 'all') {
        return null; // Not found
      }

      const categoryFilter = category.id || (slug === 'all' ? undefined : slug);
      const filteredProps = await getFilteredProducts(
        swell,
        categoryFilter
          ? {
              category: categoryFilter,
            }
          : {},
      );

      return {
        ...(category.id
          ? category._result
          : // TODO: remove this once backend is implemented for "all"
            { name: 'Products', id: 'all', slug: 'all' }),
        ...filteredProps,
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

      const results = await categories.results;
      for (const category of results) {
        category.products = new SwellStorefrontCollection(swell, 'products', {
          category: category.id,
        });
      }

      return categories._result;
    });
  }
}
