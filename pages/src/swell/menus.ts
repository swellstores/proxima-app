import get from "lodash/get";
import clone from "lodash/clone";
import snakeCase from "lodash/snakeCase";
import { arrayToObject } from "./utils";

export type Menu = {
  id: string;
  name: string;
  items: MenuItem[];
  $locale: {
    [key: string]: {
      [key: string]: string;
    };
  };
};

export enum MenuItemType {
  ProductList = "product_all",
  CategoryList = "category_all",
  Product = "product",
  Category = "category",
  Content = "content",
  Home = "home",
  Search = "search",
  Url = "url",
  Heading = "heading",
}

export type MenuItem = {
  name: string;
  type: MenuItemType;
  items: MenuItem[];
  model?: string;
  value?:
    | string
    | {
        [key: string]: any;
      };
  url?: string;
  $locale: {
    [key: string]: {
      [key: string]: string;
    };
  };
};

export function resolveMenuSettings(menus: Menu[]) {
  return arrayToObject(
    clone(menus)?.map((menu: any) => ({
      ...menu,
      items: resolveMenuItems(menu.items),
    })),
  );
}

export function resolveMenuItems(
  menuItems: MenuItem[],
  options?: { trailingSlash?: boolean },
  path?: string,
): MenuItem[] {
  return menuItems?.map((item) => {
    const handle = snakeCase(item.name).toLowerCase();
    return {
      ...item,
      url: resolveMenuUrl(item, options),
      handle: `${path ? `${path}-` : ""}${handle}`,
      ...(item.items
        ? {
            items: resolveMenuItems(item.items, options, handle),
          }
        : undefined),
    };
  });
}

export function resolveMenuUrl(
  item: MenuItem,
  options?: { trailingSlash?: boolean },
) {
  // Return error path if link item is invalid
  if (!item) return "#invalid-link-item";

  if (typeof item === "object" && item !== null) {
    // Build full path from link item object
    let itemPath = getMenuItemPath(item);

    // Add/remove trailing slash
    const endsWithSlash = itemPath.slice(-1) === "/";

    if (options?.trailingSlash && !endsWithSlash && itemPath.length > 1) {
      itemPath = itemPath + "/";
    }

    if (!options?.trailingSlash && endsWithSlash && itemPath.length > 1) {
      itemPath = itemPath.slice(0, -1);
    }

    return itemPath; // TODO wrap nuxt-i18n to generate localized path
  } else {
    // Treat item as complete URL
    return item;
  }
}

export function getMenuItemPath({ type, value, url }: MenuItem): string {
  if (typeof type === "undefined" && url) {
    return url;
  }

  // Return URL value as-is
  if (type === "url") {
    return typeof value === "string" ? value : "";
  }

  // Get slug from linked object slug or id, fall back to value itself
  const fallback = typeof value === "string" ? value : "";
  const slug = get(value, "slug", get(value, "id", fallback)) || "";

  // Build path based on content type of item
  switch (type) {
    case "home":
      return "/";
    case "category":
      return `/categories/${slug}`;
    case "product":
      return `/products/${slug}`;
    case "search":
      return `/search/`;
    default:
      return `/${slug}`;
  }
}
