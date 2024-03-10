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
  // Dynamic properties
  handle: string;
  current?: boolean;
  child_active?: boolean;
};

export function resolveMenuSettings(
  menus: Menu[],
  options?: { currentUrl?: string },
) {
  return arrayToObject(
    clone(menus)?.map((menu: any) => ({
      ...menu,
      items: resolveMenuItems(menu.items, options),
    })),
  );
}

export function resolveMenuItems(
  menuItems: MenuItem[],
  options?: { currentUrl?: string },
  path?: string,
): MenuItem[] {
  return menuItems?.map((item) => {
    const handle = snakeCase(item.name).toLowerCase();
    const url = resolveMenuUrl(item, {
      trailingSlash:
        options?.currentUrl?.endsWith("/") && options.currentUrl !== "/",
    });
    const childItems =
      item.items && resolveMenuItems(item.items, options, handle);
    return {
      ...item,
      url,
      handle: `${path ? `${path}-` : ""}${handle}`,
      current: url === options?.currentUrl,
      ...(childItems
        ? { items: childItems, child_active: isChildItemActive(childItems) }
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

function isChildItemActive(items: MenuItem[]): boolean {
  return items.some(
    (item: MenuItem) =>
      item.current || (item.items && isChildItemActive(item.items)),
  );
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
