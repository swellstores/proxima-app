import { ShopifyResource, defer } from './resource';

export default function ShopifyImage(
  _instance: ShopifyCompatibility,
  product: SwellStorefrontRecord,
  image: SwellData,
  variant?: SwellStorefrontRecord, // TODO
) {
  if (image instanceof ShopifyResource) {
    return image.clone();
  }
  return new ShopifyResource({
    alt: image.alt || defer(() => product.name),
    aspect_ratio: 1,
    attached_to_variant: true,
    height: image.height,
    id: image.file?.id,
    media_type: 'image',
    position: null,
    presentation: { focal_point: null }, // x, y
    preview_image: image.file,
    product_id: defer(() => product.id),
    src: image.file?.url,
    variants: null, // TODO
    width: image.width,
  });
}
