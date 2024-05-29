import { Swell, SwellStorefrontRecord } from '@swell/storefrontjs';
import { Variant } from 'swell-js';

export class VariantResource extends SwellStorefrontRecord {
  public product: SwellStorefrontRecord;

  constructor(
    swell: Swell,
    product: SwellStorefrontRecord,
    id: string,
    query: SwellData = {},
  ) {
    super(swell, 'variants', id, query, () =>
      swell.get('/products:variants/{id}', { id }),
    );

    this.product = product;
  }
}

export default function getVariantResource(
  swell: Swell,
  product: SwellStorefrontRecord,
  id: string,
  query: SwellData = {},
) {
  return new VariantResource(
    swell,
    product,
    id,
    query,
  ) as any as SwellStorefrontRecord & Variant;
}
