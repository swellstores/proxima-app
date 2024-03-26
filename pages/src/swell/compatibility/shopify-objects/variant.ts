import { ShopifyResource, defer } from './resource';

export default function ShopifyVariant(
  _instance: ShopifyCompatibility,
  product: SwellStorefrontRecord,
  variant: SwellStorefrontRecord,
) {
  if (variant instanceof ShopifyResource) {
    return variant.clone();
  }
  return new ShopifyResource({
    available: defer(
      () =>
        variant.stock_status === 'in_stock' || variant.stock_status === null,
    ),
    barcode: null,
    compare_at_price: defer(() => variant.compare_price),
    featured_image: defer(
      async () => (await variant.images)?.[0] || (await product.images)?.[0],
    ),
    featured_media: defer(
      async () => (await variant.images)?.[0] || (await product.images)?.[0],
    ),
    id: defer(() => variant.id),
    image: defer(
      async () => (await variant.images)?.[0] || (await product.images)?.[0],
    ),
    incoming: false,
    inventory_management: null,
    inventory_policy: null,
    matched: false,
    metafields: null,
    next_incoming_date: null,
    options: defer(async () => {
      await product.options;
      return (await variant.option_value_ids)?.map(
        (id: any) =>
          product.options?.find(
            (option: any) => id === option.id && option.active,
          )?.name,
      );
    }),
    price: defer(() =>
      variant.price !== null && variant.price !== undefined
        ? variant.price
        : product.price,
    ),
    product: defer(async () => (await product.id) && product),
    quantity_price_breaks: null,
    quantity_price_breaks_configured: defer(
      async () => (await variant.prices)?.length > 0,
    ),
    quantity_rule: null,
    requires_selling_plan: false,
    requires_shipping: defer(async () =>
      (await product.delivery)?.contains('shipment'),
    ),
    selected: false,
    selected_selling_plan_allocation: null,
    selling_plan_allocations: null,
    sku: defer(() => variant.sku),
    store_availabilities: null,
    taxable: true,
    title: defer(() => variant.name),
    unit_price: defer(() => variant.price),
    unit_price_measurement: null,
    url: defer(() => product.url),
    weight: defer(() => variant.weight),
    weight_in_unit: defer(() => variant.weight_unit),
    weight_unit: defer(() => variant.weight_unit),
  });
}
