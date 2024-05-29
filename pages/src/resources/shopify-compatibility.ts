import {
  ShopifyCompatibility,
  ShopifyArticle,
  ShopifyBlog,
  ShopifyCart,
  ShopifyCollection,
  ShopifyProduct,
  ShopifyPage,
  ShopifySearch,
  ShopifyVariant,
} from '@swell/storefrontjs';
import {
  CartResource,
  ProductResource,
  ProductListResource,
  SearchResource,
  VariantResource,
} from './';
import storefrontConfig from '../../storefront.json';

export default class StorefrontShopifyCompatibility extends ShopifyCompatibility {
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
      case 'account/orders/order':
        return 'customers/order';
      case 'account/signup':
        return 'customers/register';
      case 'account/recover':
        return 'customers/reset_password';
      case 'cart/index':
        return 'cart';
      case '404':
        return '404';
      case 'giftcard':
        return 'gift_card';
      case 'search':
        return 'search';
      default:
        return pageId;
    }
  }

  getThemeFilePath(type: string, name: string) {
    switch (type) {
      case 'assets':
        return `assets/${name}`;
      case 'components':
        return `snippets/${name}`;
      case 'config':
        return `config/${name}`;
      case 'layouts':
        return `layout/${name}`;
      case 'pages':
        return `templates/${this.getPageType(name)}`;
      case 'sections':
        return `sections/${name}`;
      default:
        throw new Error(`Theme file type not supported: ${type}`);
    }
  }

  getPageRouteUrl(pageId: string) {
    return (
      storefrontConfig.pages?.find((page) => page.id === pageId)?.url || ''
    );
  }

  getPageRouteMap() {
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
      cart_clear_url: this.getPageRouteUrl('cart/clear'),
      cart_update_url: this.getPageRouteUrl('cart/update'),
      cart_url: this.getPageRouteUrl('cart/index'),
      collections_url: this.getPageRouteUrl('categories/index'),
      predictive_search_url: this.getPageRouteUrl('search/suggest'),
      product_recommendations_url: this.getPageRouteUrl('products/index'),
      root_url: this.getPageRouteUrl('index'),
      search_url: this.getPageRouteUrl('search'),
    };
  }

  getPageResourceMap() {
    return [
      {
        page: 'collection',
        resources: [
          {
            object: ShopifyCollection,
            from: 'products',
            to: 'collection',
          },
        ],
      },
      /* {
        page: 'list-collections',
        resources: [
          {
            object: ShopifyCollections,
            from: 'categories',
            to: 'collections',
          },
        ],
      }, */
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
        from: CartResource,
        object: ShopifyCart,
      },
      {
        from: ProductResource,
        object: ShopifyProduct,
      },
      {
        from: ProductListResource,
        object: ShopifyCollection,
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
        formType: 'product',
        clientHtml: () => {
          return `
            <input type="hidden" name="product_id" value="{{ product.id }}" />
            <input type="hidden" name="variant_id" value="{{ product.selected_or_first_available_variant.id }}" />
          `;
        },
        response: async ({ response: cart }: any) => {
          if (cart) {
            // Return last added/updated item
            const item = cart.items?.find(
              (item: any) => item.id === cart.$item_id,
            );
            return item;
          }
        },
      },
      {
        pageId: 'cart/change',
        params: async ({ params, theme }: any) => {
          // Convert line number to item_id
          const prevCartItems = await theme.globals.cart?.items;
          const prevItem = prevCartItems?.[params.line - 1];
          return {
            ...params,
            prevItem,
            item_id: prevItem?.id,
            quantity: Number(params.quantity),
          };
        },
        response: async ({ params, response: cart }: any) => {
          if (cart) {
            const { prevItem, item_id, quantity } = params;
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
    ];
  }
}