import { ShopifyResource } from './resource';

export default function ShopifyMedia(
  _instance: ShopifyCompatibility,
  image: SwellData,
) {
  if (image instanceof ShopifyResource) {
    return image.clone();
  }
  return new ShopifyResource({
    alt: image.alt,
    id: image.file?.id,
    media_type: 'image',
    position: null,
    preview_image: image.file,
  });
}
