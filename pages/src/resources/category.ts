import {
  Swell,
  SwellStorefrontRecord,
  SwellStorefrontCollection,
} from '@swell/storefrontjs';
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
  public sort_options = SORT_OPTIONS.map(({ value, name }) => ({
    value,
    name,
  }));

  constructor(swell: Swell, slug: string, query: SwellData = {}) {
    super(swell, 'category', slug, query, async () => {
      const category = new SwellStorefrontRecord(swell, 'categories', slug);

      await category.id;

      // TODO: remove this once backend is implemented for "all"
      if (slug === 'all') {
        category.name = 'Products';
      }

      const filterQuery = productQueryWithFilters(swell, query);
      const products = new SwellStorefrontCollection(swell, 'products', {
        ...filterQuery,
        // TODO: remove this once backend is implemented for "all"
        category: category.id || (slug === 'all' ? undefined : slug),
      });

      await products.results;

      const filter_options =
        (products.count as number) < 5000
          ? await getProductFiltersByQuery(swell, filterQuery)
          : [];

      category.products = {
        results: products.results,
        count: products.count,
        limit: products.limit,
        pages: products.pages,
        page: products.page,
        page_count: products.page_count,
        filter_options,
      };

      return category;
    });
  }
}

export async function getProductFiltersByQuery(
  swell: Swell,
  query: SwellData = {},
) {
  const filters = await swell.get('/products/:filters', {
    ...query,
    sort: undefined,
  });

  for (const filter of filters) {
    filter.param_name = `filter_${filter.id}`;

    if (Array.isArray(filter.options)) {
      // Option `active` state
      for (const option of filter.options) {
        const queryValue = swell.queryParams[filter.param_name];
        option.active = Array.isArray(queryValue)
          ? queryValue.includes(option.value)
          : queryValue === option.value;
      }

      // Active/inactive options
      filter.active_options = filter.options.filter(
        (option: any) => option.active,
      );
      filter.inactive_options = filter.options.filter(
        (option: any) => !option.active,
      );
    }
  }

  return filters;
}

export function productQueryWithFilters(swell: Swell, query: SwellData = {}) {
  const sortBy = swell.queryParams.sort || '';
  const filters = Object.entries(swell.queryParams).reduce(
    (acc: any, [key, value]: any) => {
      if (key.startsWith('filter_')) {
        const qkey = key.replace('filter_', '');
        if (value?.gte !== undefined || value?.let !== undefined) {
          acc[qkey] = [value.gte || 0, value.lte || undefined];
        } else {
          acc[qkey] = value;
        }
      }
      return acc;
    },
    {},
  );

  console.log('query filters', filters);

  return {
    sort:
      SORT_OPTIONS.find((option) => option.value === sortBy)?.query ||
      undefined,
    $filters: filters,
    ...query,
  };
}

export const SORT_OPTIONS = [
  { value: ``, name: 'Featured' },
  { value: `popularity`, name: 'Popularity', query: 'popularity desc' },
  { value: `price_asc`, name: 'Price, low to high', query: 'price asc' },
  { value: `price_desc`, name: 'Price, high to low', query: 'price desc' },
  { value: `date_asc`, name: 'Date, old to new', query: 'date asc' },
  { value: `date_desc`, name: 'Date, new to old', query: 'date desc' },
  { value: `name_asc`, name: 'Product name, A-Z', query: 'name asc' },
  { value: `name_desc`, name: 'Product name, Z-A', query: 'name desc' },
];
