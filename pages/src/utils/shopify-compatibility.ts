import {
  Swell,
  ShopifyCompatibility,
  ShopifyArticle,
  ShopifyBlog,
  ShopifyCart,
  ShopifyCollection,
  ShopifyCollections,
  ShopifyCustomer,
  ShopifyOrder,
  ShopifyPaginate,
  SwellStorefrontPagination,
  ShopifyPredictiveSearch,
  ShopifyProduct,
  ShopifyPage,
  ShopifySearch,
  ShopifyVariant,
} from '@swell/storefrontjs';

import {
  AccountResource,
  AccountOrderResource,
  CartResource,
  CategoryResource,
  PageResource,
  PredictiveSearchResource,
  ProductResource,
  SearchResource,
  VariantResource,
} from '../resources';

import storefrontConfig from '../../storefront.json';

export default class StorefrontShopifyCompatibility extends ShopifyCompatibility {
  constructor(swell: Swell) {
    super(swell);
  }

  getPageType(pageId: string) {
    switch (pageId) {
      case 'index':
        return 'index';
      case 'products/product':
        return 'product';
      case 'products/index':
        return 'collection';
      case 'categories/category':
        return 'collection';
      case 'categories/index':
        return 'list-collections';
      case 'pages/page':
        return 'page';
      case 'content/entry':
        return 'metaobject';
      case 'blogs/blog':
        return 'article';
      case 'blogs/category':
        return 'blog';
      case 'account/index':
        return 'customers/account';
      case 'account/activate':
        return 'customers/activate_account';
      case 'account/addresses':
        return 'customers/addresses';
      case 'account/login':
        return 'customers/login';
      case 'account/order':
        return 'customers/order';
      case 'account/signup':
        return 'customers/register';
      case 'account/recover':
        return 'customers/reset_password';
      case 'cart/index':
        return 'cart';
      case '404':
        return '404';
      case 'gift-card':
        return 'gift_card';
      case 'search':
        return 'search';
      default:
        return pageId;
    }
  }

  getPageRouteUrl(pageId: string) {
    return (
      storefrontConfig.pages?.find((page) => page.id === pageId)?.url || ''
    );
  }

  getPageRoutes() {
    return {
      account_addresses_url: this.getPageRouteUrl('account/addresses'),
      account_login_url: this.getPageRouteUrl('account/login'),
      account_recover_url: this.getPageRouteUrl('account/recover'),
      account_register_url: this.getPageRouteUrl('account/signup'),
      account_url: this.getPageRouteUrl('account/index'),
      all_products_collection_url: this.getPageRouteUrl('products/index'),
      cart_url: this.getPageRouteUrl('cart'),
      collections_url: this.getPageRouteUrl('categories/index'),
      root_url: this.getPageRouteUrl('index'),
      search_url: this.getPageRouteUrl('search'),

      // Middleware or server routes
      account_logout_url: '/account/logout',
      cart_add_url: '/cart/add',
      cart_change_url: '/cart/update',
      cart_clear_url: '/cart/clear',
      cart_update_url: '/cart/update', // Same as cart_change_url with different params
      predictive_search_url: '/search/suggest',
      product_recommendations_url: null, // N/A
    };
  }

  getPageResourceMap() {
    return [
      {
        page: 'collection',
        resources: [
          {
            from: 'category',
            to: 'collection',
            object: ShopifyCollection,
          },
        ],
      },
      {
        page: 'list-collections',
        resources: [
          {
            from: 'categories',
            to: 'collections',
            object: ShopifyCollections,
          },
        ],
      },
      {
        page: 'article',
        resources: [
          {
            from: 'blog',
            to: 'article',
            object: ShopifyArticle,
          },
        ],
      },
      {
        page: 'blog',
        resources: [
          {
            from: 'category',
            to: 'blog',
            object: ShopifyBlog,
          },
        ],
      },
    ];
  }

  getObjectResourceMap() {
    return [
      {
        from: AccountResource,
        object: ShopifyCustomer,
      },
      {
        from: AccountOrderResource,
        object: ShopifyOrder,
      },
      {
        from: CartResource,
        object: ShopifyCart,
      },
      {
        from: CategoryResource,
        object: ShopifyCollection,
      },
      {
        from: PredictiveSearchResource,
        object: ShopifyPredictiveSearch,
      },
      {
        from: PageResource,
        object: ShopifyPage,
      },
      {
        from: ProductResource,
        object: ShopifyProduct,
      },
      {
        from: SearchResource,
        object: ShopifySearch,
      },
      {
        from: SwellStorefrontPagination,
        object: ShopifyPaginate,
      },
      {
        from: VariantResource,
        object: ShopifyVariant,
      },
    ];
  }

  getFormResourceMap() {
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
        shopifyType: null, // No Shopify equivalent, manually executed by the cart_update handler
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
        shopifyType: null, // Same form type as Shopify
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
      },
      {
        type: 'account_password_reset',
        shopifyType: 'reset_customer_password',
        clientHtml: () => {
          return `
            <input type="hidden" name="password_reset_key" value="{{ password_reset_key }}" />
          `;
        },
        serverParams: ({ params }: any) => {
          const { customer } = params;

          return {
            password: customer?.password,
            password_confirmation: customer?.password_confirmation,
          };
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
