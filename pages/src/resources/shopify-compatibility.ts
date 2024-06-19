import {
  ShopifyCompatibility,
  ShopifyArticle,
  ShopifyBlog,
  ShopifyCart,
  ShopifyCollection,
  ShopifyCollections,
  ShopifyCustomer,
  ShopifyOrder,
  ShopifyProduct,
  ShopifyPage,
  ShopifySearch,
  ShopifyVariant,
} from '@swell/storefrontjs';

import {
  AccountResource,
  CartResource,
  CategoryResource,
  OrderResource,
  ProductResource,
  SearchResource,
  SubscriptionResource,
  VariantResource,
} from './';

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
      account_logout_url: this.getPageRouteUrl('account/logout'),
      account_recover_url: this.getPageRouteUrl('account/recover'),
      account_register_url: this.getPageRouteUrl('account/signup'),
      account_url: this.getPageRouteUrl('account/index'),
      all_products_collection_url: this.getPageRouteUrl('products/index'),
      cart_add_url: this.getPageRouteUrl('cart/add'),
      cart_change_url: this.getPageRouteUrl('cart/change'),
      cart_url: this.getPageRouteUrl('cart/index'),
      collections_url: this.getPageRouteUrl('categories/index'),
      predictive_search_url: this.getPageRouteUrl('search/suggest'),
      product_recommendations_url: this.getPageRouteUrl('products/index'),
      root_url: this.getPageRouteUrl('index'),
      search_url: this.getPageRouteUrl('search'),

      // TODO: implement support for these
      // cart_clear_url: this.getPageRouteUrl('cart/clear'),
      // cart_update_url: this.getPageRouteUrl('cart/update'),
    };
  }

  getPageResourceMap() {
    return [
      {
        page: 'collection',
        resources: [
          {
            object: ShopifyCollection,
            from: 'category',
            to: 'collection',
          },
        ],
      },
      {
        page: 'list-collections',
        resources: [
          {
            object: ShopifyCollections,
            from: 'categories',
            to: 'collections',
          },
        ],
      },
      {
        page: 'article',
        resources: [
          {
            object: ShopifyArticle,
            from: 'blog',
            to: 'article',
          },
        ],
      },
      {
        page: 'blog',
        resources: [
          {
            object: ShopifyBlog,
            from: 'category',
            to: 'blog',
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
        from: CartResource,
        object: ShopifyCart,
      },
      {
        from: CategoryResource,
        object: ShopifyCollection,
      },
      {
        from: OrderResource,
        object: ShopifyOrder,
      },
      {
        from: ProductResource,
        object: ShopifyProduct,
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
        pageId: 'cart/add',
        formType: 'product',
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
            ...params,
            prevItems,
            variant_id,
          };
        },
        serverResponse: async ({ params, response: cart }: any) => {
          const { prevItems } = params;

          if (cart) {
            // Return last added/updated item
            const item = findUpdatedCartItem(prevItems, cart.items);
            return item;
          }
        },
      },
      {
        pageId: 'cart/change',
        serverParams: async ({ params, theme }: any) => {
          const { line, quantity } = params;

          // Convert line number to item_id
          const prevCartItems = await theme.globals.cart?.items;
          const prevItem = prevCartItems?.[line - 1];
          return {
            ...params,
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
        formType: 'customer_login',
        serverParams: ({ params }: any) => {
          const { customer } = params;
          return {
            ...params,
            email: customer?.email,
            password: customer?.password,
          };
        },
      },
      {
        formType: 'create_customer',
        serverParams: ({ params }: any) => {
          const { customer } = params;

          return {
            first_name: customer?.first_name,
            last_name: customer?.last_name,
            email: customer?.email,
            password: customer?.password,
          };
        },
      },
      {
        formType: 'reset_customer_password',
        clientHtml: () => {
          return `
            <input type="hidden" name="password_reset_key" value="{{ password_reset_key }}" />
          `;
        },
        serverParams: ({ params }: any) => {
          const { customer } = params;

          return {
            ...params,
            password: customer?.password,
            password_confirmation: customer?.password_confirmation,
          };
        },
      },
      {
        formType: 'customer_address',
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
            ...params,
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
          };
        },
      },
    ];
  }
}

function findUpdatedCartItem(prevItems: any[], newItems: any[]) {
  return (newItems || []).find((newItem) => {
    const prevItem = (prevItems || []).find((item) => item.id === newItem.id);
    return !prevItem || prevItem.quantity !== newItem.quantity;
  });
}