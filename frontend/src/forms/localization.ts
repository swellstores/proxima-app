import type { SwellServerContext } from '@/utils/server';

export async function localizationUpdate(context: SwellServerContext) {
  const { params, swell } = context;
  const locale = params.locale || params.language_code;
  const currency = params.currency || params.currency_code;

  console.log('localizationUpdate', params);

  if (locale) {
    await swell.storefront.locale.select(locale);
  }

  if (currency) {
    await swell.storefront.currency.select(currency);
  }
}

export default [
  {
    id: 'localization',
    url: '/localization',
    handler: localizationUpdate,
  },
];
