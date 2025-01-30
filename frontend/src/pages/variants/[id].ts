import { handleServerRequest } from '@/utils/server';
import { ProductResource, VariantResource } from '@/resources';

export const GET = handleServerRequest(async ({ context, swell }) => {
  const { id } = context.params;

  // Find variant by ID first
  const variantRecord = await swell.get('/products:variants/{id}', {
    id,
    fields: 'parent_id',
  });

  const product = new ProductResource(swell, variantRecord?.parent_id);

  const product_variant = new VariantResource(swell, product, id);

  return { product_variant };
});
