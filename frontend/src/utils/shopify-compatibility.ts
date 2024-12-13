import {
  SwellTheme,
  ShopifyCompatibility,
  ShopifyFormResourceMap,
} from '@swell/apps-sdk';

export default class StorefrontShopifyCompatibility extends ShopifyCompatibility {
  constructor(theme: SwellTheme) {
    super(theme);
  }

  getFormResourceMap(): ShopifyFormResourceMap {
    return [
      {
        type: 'cart_add',
        shopifyType: 'product',
        clientHtml: () => {
          return `
            <input type="hidden" name="product_id" value="{{ product.id }}" />
          `;
        },
        serverParams: async ({ params, theme }: any) => {
          const { id, product_id } = params;
          const prevItems = await theme.globals.cart?.items;

          // Shopify uses id as variant_id, or product_id if no variant selected
          const variant_id = id && id !== product_id ? id : undefined;

          return {
            prevItems,
            variant_id,
          };
        },
        serverResponse: async ({ params, response: cart }: any) => {
          const { prevItems } = params;

          if (cart) {
            // Return last added/updated item where quantity changed
            const cartItems = await cart.items;

            const item = (cartItems || []).find((newItem: any) => {
              const prevItem = (prevItems || []).find(
                (item: any) => item.id === newItem.id,
              );
              return !prevItem || prevItem.quantity !== newItem.quantity;
            });

            return item;
          }
        },
      },
      {
        type: 'cart_update',
        shopifyType: undefined, // No Shopify equivalent, manually executed by the cart_update handler
        serverParams: async ({ params, theme }: any) => {
          const { line, quantity } = params;

          // Convert line number to item_id
          const prevCartItems = await theme.globals.cart?.items;
          const prevItem = prevCartItems?.[line - 1];

          return {
            prevItem,
            item_id: prevItem?.id,
            quantity: Number(quantity),
          };
        },
        serverResponse: async ({ params, response: cart }: any) => {
          const { prevItem, item_id, quantity } = params;

          if (cart) {
            const updatedCartItem = cart.items?.find(
              (item: any) => item.id === item_id,
            );

            // Indicate which item was updated or removed
            return {
              ...cart,
              items_added: prevItem && quantity > 0 ? [updatedCartItem] : [],
              items_removed: prevItem && quantity === 0 ? [prevItem] : [],
            };
          }
        },
      },
      {
        type: 'localization',
        shopifyType: undefined, // Same form type as Shopify
        serverParams: ({ params }: any) => {
          const { country_code, locale_code } = params;

          return {
            currency: country_code,
            locale: locale_code,
          };
        },
      },
      {
        type: 'account_login',
        shopifyType: 'customer_login',
        serverParams: ({ params }: any) => {
          const { customer } = params;

          return {
            account: {
              email: customer?.email,
              password: customer?.password,
            },
          };
        },
      },
      {
        type: 'account_create',
        shopifyType: 'create_customer',
        serverParams: ({ params }: any) => {
          const { customer } = params;

          return {
            account: {
              first_name: customer?.first_name,
              last_name: customer?.last_name,
              email: customer?.email,
              password: customer?.password,
            },
          };
        },
      },
      {
        type: 'account_subscribe',
        shopifyType: 'customer',
        serverParams: ({ params }: any) => {
          const { contact } = params;

          return {
            account: {
              email: contact?.email,
              email_optin: true,
            },
          };
        },
      },
      {
        type: 'account_password_recover',
        shopifyType: 'recover_customer_password',
        serverParams: ({ params }: any) => {
          const { customer } = params;

          if (customer) {
            return {
              password: customer.password,
              password_confirmation: customer.password_confirmation,
            };
          }
        },
      },
      {
        type: 'account_password_reset',
        shopifyType: 'reset_customer_password',
        clientHtml: () => {
          return `
            <input type="hidden" name="password_reset_key" value="{{ password_reset_key }}" />
          `;
        },
      },
      {
        type: 'account_address',
        shopifyType: 'customer_address',
        clientHtml: (_scope: any, arg: any) => {
          if (arg?.id) {
            return `
              <input type="hidden" name="account_address_id" value="${arg?.id}" />
            `;
          }
        },
        serverParams: ({ params }: any) => {
          const { address } = params;

          const hasName = address?.first_name || address?.last_name;

          return {
            address: {
              first_name: address?.first_name || (!hasName ? 'test' : ''),
              last_name: address?.last_name || (!hasName ? 'test' : ''),
              company: address?.company,
              address1: address?.address1,
              address2: address?.address2,
              city: address?.city,
              country: address?.country,
              state: address?.province,
              zip: address?.zip,
              phone: address?.phone,
            },
          };
        },
      },
    ];
  }
}
