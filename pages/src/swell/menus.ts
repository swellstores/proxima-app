import get from "lodash/get";
import { SwellStorefrontRecord } from './api';
import { arrayToObject } from './utils';

export function resolveMenuSettings(
  theme: SwellTheme,
  menus: SwellMenu[],
  options?: { currentUrl?: string },
) {
  const resolvedMenus =
    menus
      ?.map((menu: SwellMenu) => ({
        ...menu,
        items: resolveMenuItems(theme, menu.items, options),
      }))
      .map((menu) => {
        if (theme.shopifyCompatibility) {
          Object.assign(menu, theme.shopifyCompatibility.getMenuData(menu));
        }
        return menu;
        // todo set handle-based menu ids if set
      }) || [];

  return arrayToObject([
    ...resolvedMenus,
    // Add menus with id as handle for shopify compatibility
    ...(theme.shopifyCompatibility
      ? resolvedMenus
          .map((menu) => {
            if ((menu as any).handle) {
              return {
                ...menu,
                id: (menu as any).handle,
              };
            }
          })
          .filter(Boolean)
      : []),
  ]);
}

export function resolveMenuItems(
  theme: SwellTheme,
  menuItems: SwellMenuItem[],
  options?: { currentUrl?: string },
): SwellMenuItem[] {
  return menuItems?.map((item) => {
    const { url, resource } = resolveMenuItemUrlAndResource(theme, item, {
      trailingSlash:
        options?.currentUrl?.endsWith('/') && options.currentUrl !== '/',
    });

    const childItems =
      item.items && resolveMenuItems(theme, item.items, options);

    return {
      ...item,
      url,
      resource,
      levels: countChildItemLevels(childItems),
      current: options?.currentUrl === url,
      active: options?.currentUrl?.startsWith(url),
      ...(childItems
        ? {
            items: childItems,
            child_current: isChildItemCurrent(childItems),
            child_active: isChildItemActive(childItems),
          }
        : undefined),
    };
  });
}

export function resolveMenuItemUrlAndResource(
  theme: SwellTheme,
  item: SwellMenuItem,
  options?: { trailingSlash?: boolean },
): { url: string; resource?: SwellStorefrontRecord } {
  if (!item) return { url: '#invalid-link-item' };

  if (typeof item === 'object' && item !== null) {
    let { url, resource } = getMenuItemUrlAndResource(theme, item);

    // Add/remove trailing slash
    const endsWithSlash = url.slice(-1) === '/';
    if (options?.trailingSlash && !endsWithSlash && url.length > 1) {
      url = url + '/';
    }
    if (!options?.trailingSlash && endsWithSlash && url.length > 1) {
      url = url.slice(0, -1);
    }

    return { url, resource }; // TODO wrap nuxt-i18n to generate localized path
  } else {
    // Treat item as complete URL
    return { url: item };
  }
}

function countChildItemLevels(items: SwellMenuItem[]): number {
  return (
    items?.reduce(
      (max, item) =>
        Math.max(max, item.items ? 1 + countChildItemLevels(item.items) : 0),
      0,
    ) || 0
  );
}

function isChildItemCurrent(items: SwellMenuItem[]): boolean {
  return items.some(
    (item: SwellMenuItem) =>
      item.current || (item.items && isChildItemActive(item.items)),
  );
}

function isChildItemActive(items: SwellMenuItem[]): boolean {
  return items.some(
    (item: SwellMenuItem) =>
      item.active || (item.items && isChildItemActive(item.items)),
  );
}

export function getMenuItemSlug(value: any): string {
  // Get slug from linked object slug or id, fall back to value itself
  const fallback = typeof value === 'string' ? value : '';
  const slug = get(value, 'slug', get(value, 'id', fallback)) || '';

  return slug;
}

export function getMenuItemUrlAndResource(
  theme: SwellTheme,
  menuItem: SwellMenuItem,
): { url: string; resource?: SwellStorefrontRecord } {
  const { type, value, url, model } = menuItem;

  if (typeof type === 'undefined' && url) {
    return { url };
  }

  // Return URL value as-is
  if (type === 'url') {
    return { url: typeof value === 'string' ? value : '' };
  }

  const slug = getMenuItemSlug(value);

  // Build path based on content type of item
  switch (type) {
    case 'home':
      return {
        url: getMenuItemStorefrontUrl(theme.storefrontConfig, 'index'),
      };
    case 'category':
      return {
        url: getMenuItemStorefrontUrl(
          theme.storefrontConfig,
          'categories/category',
          slug,
        ),
        resource: new SwellStorefrontRecord(theme.swell, 'categories', slug),
      };
    case 'product':
      return {
        url: getMenuItemStorefrontUrl(
          theme.storefrontConfig,
          'products/product',
          slug,
        ),
        resource: new SwellStorefrontRecord(theme.swell, 'products', slug),
      };
    case 'content':
      let contentUrl;
      switch (model) {
        case 'content/pages':
          contentUrl = getMenuItemStorefrontUrl(
            theme.storefrontConfig,
            'pages/page',
            slug,
          );
          break;
        case 'content/blogs':
          contentUrl = getMenuItemStorefrontUrl(
            theme.storefrontConfig,
            'blogs/blog',
            slug,
          );
          break;
        default:
          contentUrl = getMenuItemStorefrontUrl(
            theme.storefrontConfig,
            'content/content',
            slug,
            model?.replace('content/', ''),
          );
          break;
      }
      if (model && contentUrl) {
        return {
          url: contentUrl,
          resource: new SwellStorefrontRecord(theme.swell, model, slug),
        };
      }
      return { url: `/${slug}` };
    case 'search':
      return {
        url: getMenuItemStorefrontUrl(theme.storefrontConfig, 'search'),
      };
    default:
      return {
        url: `/${slug}`,
      };
  }
}

export function getMenuItemStorefrontUrl(
  storefrontConfig: SwellStorefrontConfig,
  pageId: string,
  slug?: string,
  collectionSlug?: string,
): string {
  let url = storefrontConfig.pages?.find((page) => page.id === pageId)?.url;

  if (url?.includes('{collection}') && collectionSlug) {
    url = url.replace('{collection}', collectionSlug);
  }

  if (url?.includes('{slug}')) {
    url = url.replace('{slug}', slug || '');
  }

  return url || `/${slug || ''}`;
}