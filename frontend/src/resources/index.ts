import {
  AccountResource,
  AccountAddressesResource,
  AccountOrderResource,
  AccountOrdersResource,
  AccountSubscriptionResource,
  AccountSubscriptionsResource,
} from './account';
import { BlogResource, BlogCategoryResource } from './blog';
import { CartResource } from './cart';
import { CategoryResource, CategoriesResource } from './category';
import { PageResource } from './page';
import { ProductResource } from './product';
import { SearchResource, PredictiveSearchResource } from './search';
import { VariantResource } from './variant';

export {
  AccountResource,
  AccountAddressesResource,
  AccountOrderResource,
  AccountOrdersResource,
  AccountSubscriptionResource,
  AccountSubscriptionsResource,
  BlogResource,
  BlogCategoryResource,
  CartResource,
  CategoryResource,
  CategoriesResource,
  PageResource,
  PredictiveSearchResource,
  ProductResource,
  SearchResource,
  VariantResource,
};

export default {
  singletons: {
    account: AccountResource,
    cart: CartResource,
  },
  records: {
    'content/blogs': BlogResource,
    'content/blogs-categories': BlogCategoryResource,
    categories: CategoryResource,
    pages: PageResource,
    products: ProductResource,
    search: SearchResource,
  },
};
