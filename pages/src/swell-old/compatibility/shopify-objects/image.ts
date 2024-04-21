import { ShopifyResource, defer } from './resource';

export default function ShopifyImage(
  _instance: ShopifyCompatibility,
  image: SwellData,
  product?: StorefrontResource | SwellRecord,
  variant?: StorefrontResource | SwellRecord, // TODO
) {
  if (image instanceof ShopifyResource) {
    return image.clone();
  }

  return new ShopifyResource({
    alt: defer(() => image.alt || product?.name),
    aspect_ratio: 1,
    attached_to_variant: true,
    height: defer(() => image.height),
    id: defer(async () => (await image.file)?.id),
    media_type: 'image',
    position: null,
    presentation: { focal_point: null }, // x, y
    preview_image: defer(() => image.file),
    product_id: defer(() => product?.id),
    src: defer(async () => (await image.file) && ShopifyImageSrc(image.file)),
    variants: null, // TODO
    width: defer(() => image.width),
  });
}

export function ShopifyImageSrc(file: SwellData) {
  return new ShopifyResource(
    {
      url: file.url,
      width: file.width,
      height: file.height,
    },
    'url',
  );
}