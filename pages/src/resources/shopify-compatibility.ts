import {
  ShopifyCompatibility,
  ShopifyArticle,
  ShopifyBlog,
  ShopifyCollection,
  ShopifyProduct,
  ShopifyPage,
  ShopifySearch,
} from '@swell/storefrontjs';
import { ProductResource, ProductListResource, SearchResource } from './';
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
      case 'cart':
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
      cart_add_url: this.getPageRouteUrl('cart'),
      cart_change_url: this.getPageRouteUrl('cart'),
      cart_clear_url: this.getPageRouteUrl('cart'),
      cart_update_url: this.getPageRouteUrl('cart'),
      cart_url: this.getPageRouteUrl('cart'),
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
        from: ProductResource,
        object: ShopifyProduct,
      },
      {
        from: ProductListResource,
        object: ShopifyCollection,
      },
    ];
  }

  /* getResourceData(resource: StorefrontResource): SwellData {
    const instance = this as ShopifyCompatibility;

    if (resource instanceof ProductListResource) {
      return {
        collection: ShopifyCollection(instance, resource as any),
      };
    }

    if (resource instanceof SwellStorefrontCollection) {
      // Products are always contained in a collection
      if (resource?._collection === 'products') {
        return {
          collection: ShopifyCollection(instance, resource as any),
        };
      }
    } else if (resource instanceof SwellStorefrontRecord) {
      if (resource?._collection === 'content/blogs') {
        return {
          article: ShopifyArticle(instance, resource as any),
        };
      }

      if (resource?._collection === 'content/blog-categories') {
        return {
          blog: ShopifyBlog(instance, resource as any),
        };
      }
    }

    return {};
  }

  getResourceProps(resource: StorefrontResource): SwellData {
    if (resource instanceof ProductResource) {
      return ShopifyProduct(this, resource);
    }
    if (resource instanceof SearchResource) {
      return ShopifySearch(this, resource);
    }

    // Old stuff

    if (resource instanceof SwellStorefrontCollection) {
      return {
        size: resource.results.length,
        results: resource.results.map((result: SwellRecord) => {
          if (resource?._collection === 'products') {
            return ShopifyProduct(this, result);
          }
          return result;
        }),
      };
    } else if (resource instanceof SwellStorefrontRecord) {
      if (resource?._collection === 'products') {
        return ShopifyProduct(this, resource);
      }

      if (resource?._collection === 'categories') {
        const products = new SwellStorefrontCollection(this.swell, 'products', {
          categories: [resource._id],
        });
        return ShopifyCollection(this, products);
      }

      if (resource?._collection === 'content/pages') {
        return ShopifyPage(this, resource);
      }

      if (resource?._collection === 'content/blogs') {
        return ShopifyArticle(this, resource);
      }

      if (resource?._collection === 'content/blog-categories') {
        return ShopifyBlog(this, resource);
      }
    }

    return {};
  } */
}
