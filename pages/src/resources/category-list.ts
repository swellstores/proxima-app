import {
  Swell,
  StorefrontResource,
  SwellStorefrontCollection,
} from '@swell/storefrontjs';

export default function getCategoryListResource(swell: Swell) {
  return new CategoryListResource(swell);
}

export class CategoryListResource extends StorefrontResource {
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

      return categories;
    });
  }
}
