import {
  Swell,
  SwellData,
  SwellRecord,
  SwellStorefrontRecord,
} from '@swell/apps-sdk';

export class VariantResource extends SwellStorefrontRecord {
  public product: SwellStorefrontRecord;

  constructor(
    swell: Swell,
    product: SwellStorefrontRecord,
    id: string,
    query: SwellData = {},
  ) {
    super(swell, 'variants', id, query, async () => {
      const record = await swell.get('/products:variants/{id}', { id });
      return (record as SwellRecord) ?? null;
    });

    this.product = product;
  }
}
