import { ShopifyResource, defer } from './resource';
import ShopifyVariant from './variant';
import ShopifyImage from './image';
import ShopifyMedia from './media';

export default function ShopifyProduct(
  instance: ShopifyCompatibility,
  product: StorefrontResource | SwellRecord,
): ShopifyResource {
  if (product instanceof ShopifyResource) {
    return product.clone();
  }

  return new ShopifyResource({
    available: defer(
      async () =>
        (await product.stock_status) === 'in_stock' ||
        product.stock_status === null,
    ),
    collections: [], // TODO: need to support this in the resource class somehow
    compare_at_price: defer(() => product.compare_price),
    compare_at_price_max: null,
    compare_at_price_min: null,
    compare_at_price_varies: false,
    content: defer(() => product.description),
    created_at: defer(() => product.date_created),
    description: defer(() => product.description),
    featured_image: defer(
      async () =>
        (await product.images) &&
        product.images?.[0] &&
        ShopifyImage(instance, product.images[0], product),
    ),
    featured_media: defer(
      async () =>
        (await product.images) &&
        (await product.images?.[0]) &&
        ShopifyMedia(instance, product.images[0]),
    ),
    first_available_variant: defer(async () =>
      (await product.variants)?.results?.find(
        (variant: any) =>
          variant.stock_status === 'in_stock' || variant.stock_status === null,
      ),
    ),
    gift_card: defer(() => product.type === 'giftcard'),
    handle: defer(() => product.slug),
    has_only_default_variant: defer(() => !product.variable),
    id: defer(() => product.id),
    images: defer(async () =>
      (await product.images)?.map(
        (image: any) => image && ShopifyImage(instance, image, product),
      ),
    ),
    media: defer(async () =>
      (await product.images)?.map((image: any) =>
        ShopifyMedia(instance, image),
      ),
    ),
    metafields: null,
    options: defer(async () =>
      (await product.options)
        ?.map((option: any) => option.active && option.name)
        .filter(Boolean),
    ),
    options_by_name: defer(async () =>
      (await product.options)
        ?.filter((option: any) => option.active)
        .reduce((acc: any, option: any) => {
          return { ...acc, [option.name?.toLowerCase()]: option };
        }, {}),
    ),
    options_with_values: defer(async () =>
      (await product.options)?.map((option: any, index: number) => ({
        name: option.name,
        position: index + 1,
        selected_value: null,
        values: option.values?.map((value: any, index: number) => ({
          id: value.id,
          name: value.name,
          product_url: null,
          selected: false,
          swatch: null,
          variant: null,
        })),
      })),
    ),
    price: defer(() => product.price),
    price_max: defer(async () =>
      (await product.variants)?.results?.reduce(
        (max: any, variant: any) => Math.max(max, variant.price),
        0,
      ),
    ),
    price_min: defer(async () =>
      (await product.variants)?.results?.reduce(
        (min: any, variant: any) => Math.min(min, variant.price),
        Infinity,
      ),
    ),
    price_varies: defer(async () =>
      (await product.variants)?.results?.some(
        (variant: any) => variant.price !== product.price,
      ),
    ),
    published_at: defer(() => product.date_created),
    quantity_price_breaks_configured: defer(() => product.prices?.length > 0),
    requires_selling_plan: false,
    selected_or_first_available_selling_plan_allocation: null,
    selected_or_first_available_variant: defer(async () =>
      ShopifyVariant(
        instance,
        product,
        (await product.variants)?.results?.find(
          (variant: any) =>
            variant.stock_status === 'in_stock' ||
            variant.stock_status === null,
        ) || product,
      ),
    ),
    selected_selling_plan: null,
    selected_variant: null,
    selling_plan_groups: null,
    tags: defer(() => product.tags),
    template_suffix: null,
    title: defer(() => product.name),
    type: defer(() => product.type),
    url: defer(() => `/products/${product.slug}`), // TODO: pass theme settings to get this correctly
    variants: defer(async () =>
      (await product.variants)?.results?.map((variant: any) =>
        ShopifyVariant(instance, product, variant),
      ),
    ),
    vendor: null,
  });
}
