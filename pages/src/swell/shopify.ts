import { AstroGlobal } from "astro";
import { Swell } from "./api";
import { ThemeGlobals } from "./liquid-next/types";

export class ShopifyCompatibility {
  static applyGlobals(Astro: AstroGlobal, swell: Swell, globals: ThemeGlobals) {
    /*
     * Page is used both globally and in content pages
     * https://shopify.dev/docs/api/liquid/objects/page
     */
    globals.page = {
      ...(globals.page || undefined),
      url: Astro.url.pathname,
    };

    globals.request = {
      ...(globals.request || undefined),
      host: Astro.url.host,
      origin: Astro.url.origin,
      path: Astro.url.pathname,
      locale: globals.store.locale,
      design_mode: swell.isEditor,
      visual_section_preview: false, // TODO: Add support for visual section preview
      page_type: ShopifyCompatibility.getPageType(globals.page),
    };
  }

  static getPageType(page: any) {
    switch (page?.id) {
      case "index":
        return "index";
      case "products/product":
        return "product";
      case "categories/category":
        return "collection";
      case "categories/index":
        return "list-collections";
      case "pages/page":
        return "page";
      case "content/entry":
        return "metaobject";
      case "blogs/index":
        return "blog";
      case "blogs/blog":
        return "article";
      case "account/index":
        return "customers/account";
      case "account/activate":
        return "customers/activate_account";
      case "account/addresses":
        return "customers/addresses";
      case "account/login":
        return "customers/login";
      case "account/orders/order":
        return "customers/order";
      case "account/signup":
        return "customers/register";
      case "account/recover":
        return "customers/reset_password";
      case "cart":
        return "cart";
      case "404":
        return "404";
      case "giftcard":
        return "gift_card";
      case "search":
        return "search";
      default:
        return "page";
    }
  }
}
