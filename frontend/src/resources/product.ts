import {
  Swell,
  SwellData,
  SwellStorefrontRecord,
  SwellStorefrontCollection,
} from '@swell/apps-sdk';

export class ProductResource extends SwellStorefrontRecord {
  constructor(swell: Swell, slug: string, query: SwellData = {}) {
    super(swell, 'products', slug, query);
  }
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

export async function getFilteredProducts(
  swell: Swell,
  productQuery?: SwellData,
) {
  const { page, limit } = swell.queryParams;
  const resource = new SwellStorefrontCollection(
    swell,
    'products',
    { page, limit, ...(productQuery || undefined) },
    async function (this: SwellStorefrontCollection): Promise<any> {
      const filterQuery = productQueryWithFilters(swell, productQuery);

      let result;
      if (productQuery !== undefined) {
        this._query = {
          ...this._query,
          ...filterQuery,
        };
        result = await this._defaultGetter().call(this);
      }

      const filter_options =
        result !== undefined && ((result?.count as number) || 0) < 5000
          ? await getProductFiltersByQuery(swell, filterQuery)
          : [];

      return {
        ...result,
        filter_options,
      };
    },
  );

  const sortBy = swell.queryParams.sort || '';

  return {
    products: resource,
    sort: SORT_OPTIONS.find((option) => option.value === sortBy)?.value,
    sort_options: SORT_OPTIONS,
  };
}

export async function getProductFiltersByQuery(
  swell: Swell,
  query: SwellData = {},
) {
  const filters =
    (await swell.get('/products/:filters', {
      ...query,
      sort: undefined,
    })) || [];

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
        if (value?.gte !== undefined || value?.lte !== undefined) {
          acc[qkey] = [value.gte || 0, value.lte || undefined];
        } else {
          acc[qkey] = value;
        }
      }
      return acc;
    },
    {},
  );

  return {
    sort:
      SORT_OPTIONS.find((option) => option.value === sortBy)?.query ||
      undefined,
    $filters: filters,
    ...query,
  };
}
