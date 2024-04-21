import get from "lodash/get";
import { SwellStorefrontRecord, SwellStorefrontCollection } from './api';
import { arrayToObject } from './utils';

export async function resolveMenuSettings(
  theme: SwellTheme,
  menus: SwellMenu[],
  options?: { currentUrl?: string },
) {
  const resolvedMenus = await Promise.all(
    menus?.map(async (menu: SwellMenu) => ({
      ...menu,
      items: await resolveMenuItems(theme, menu.items, options),
    })),
  );

  const compatibleMenus =
    resolvedMenus.map((menu) => {
      if (theme.shopifyCompatibility) {
        Object.assign(menu, theme.shopifyCompatibility.getMenuData(menu));
      }
      return menu;
      // todo set handle-based menu ids if set
    }) || [];

  return arrayToObject([
    ...compatibleMenus,
    // Add menus with id as handle for shopify compatibility
    ...(theme.shopifyCompatibility
      ? compatibleMenus
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

export async function resolveMenuItems(
  theme: SwellTheme,
  menuItems: SwellMenuItem[],
  options?: { currentUrl?: string },
): Promise<SwellMenuItem[]> {
  return Promise.all(
    menuItems?.map(async (item) => {
      const { url, resource } = await resolveMenuItemUrlAndResource(
        theme,
        item,
        {
          trailingSlash:
            options?.currentUrl?.endsWith('/') && options.currentUrl !== '/',
        },
      );

      const childItems =
        item.items && (await resolveMenuItems(theme, item.items, options));

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
    }),
  );
}

export async function resolveMenuItemUrlAndResource(
  theme: SwellTheme,
  item: SwellMenuItem,
  options?: { trailingSlash?: boolean },
): Promise<{
  url: string;
  resource?: SwellStorefrontRecord | SwellStorefrontCollection;
}> {
  if (!item) return { url: '#invalid-link-item' };

  if (typeof item === 'object' && item !== null) {
    let { url, resource } = await getMenuItemUrlAndResource(theme, item);

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

export function getMenuItemValueId(value: any): string {
  // Get slug from linked object slug or id, fall back to value itself
  const fallback = typeof value === 'string' ? value : '';
  const slug = get(value, 'id', get(value, 'slug', fallback)) || '';

  return slug;
}

export async function getMenuItemUrlAndResource(
  theme: SwellTheme,
  menuItem: SwellMenuItem,
): Promise<{
  url: string;
  resource?: SwellStorefrontRecord | SwellStorefrontCollection;
}> {
  const { type, value, url, model } = menuItem;

  if (typeof type === 'undefined' && url) {
    return { url };
  }

  // Return URL value as-is
  if (type === 'url') {
    return { url: typeof value === 'string' ? value : '' };
  }

  const id = getMenuItemValueId(value);

  // Build path based on content type of item
  switch (type) {
    case 'home':
      return {
        url: getMenuItemStorefrontUrl(theme, 'index'),
      };

    case 'category':
      if (!id) {
        return {
          url: getMenuItemStorefrontUrl(theme, 'categories/index'),
        };
      }
      return await deferMenuItemUrlAndResource(
        theme,
        'categories/category',
        id,
      );

    case 'product':
      if (!id) {
        return {
          url: getMenuItemStorefrontUrl(theme, 'products/index'),
        };
      }
      return await deferMenuItemUrlAndResource(theme, 'products/product', id);

    case 'page':
      return await deferMenuItemUrlAndResource(theme, 'pages/page', id);

    case 'blog':
      return await deferMenuItemUrlAndResource(
        theme,
        'blogs/blog',
        id,
        async (blog: any) => {
          const blogCategory = new SwellStorefrontRecord(
            theme.swell,
            'content/blog-categories',
            blog.category_id,
          );
          return blogCategory.slug;
        },
      );

    case 'blog_category':
      return await deferMenuItemUrlAndResource(theme, 'blogs/category', id);

    case 'content_list':
      if (model) {
        const slug = model?.replace('content/', '');
        return {
          url: getMenuItemStorefrontUrl(theme, 'content/index', slug),
          resource: new SwellStorefrontCollection(theme.swell, model),
        };
      }
      break;

    case 'content':
      if (model) {
        const collectionSlug = model?.replace('content/', '');
        return await deferMenuItemUrlAndResource(
          theme,
          'content/content',
          id,
          collectionSlug,
        );
      }
      break;

    case 'search':
      return {
        url: getMenuItemStorefrontUrl(theme, 'search'),
      };

    default:
      break;
  }

  return {
    url: `/${id}`,
  };
}

export function getMenuItemStorefrontUrl(
  theme: SwellTheme,
  pageId: string,
  slug?: string,
  collectionSlug?: string,
): string {
  const { storefrontConfig } = theme;
  let url = storefrontConfig?.pages?.find((page) => page.id === pageId)?.url;

  if (url?.includes('{collection}') && collectionSlug) {
    url = url.replace('{collection}', collectionSlug);
  }

  if (url?.includes('{slug}')) {
    url = url.replace('{slug}', slug || '');
  }

  return url || `/${slug || ''}`;
}

export async function deferMenuItemUrlAndResource(
  theme: SwellTheme,
  pageId: string,
  id: string,
  collectionSlugOrHandler?: string | Function,
): Promise<{ url: string; resource?: any }> {
  const { storefrontConfig } = theme;

  const collection = storefrontConfig?.pages?.find(
    (page) => page.id === pageId,
  )?.collection;

  const resource =
    collection && new SwellStorefrontRecord(theme.swell, collection, id);
  const slug = (await (resource as any)?.slug) || id;

  let collectionSlug = collectionSlugOrHandler;
  if ((resource as any)?.id && typeof collectionSlugOrHandler === 'function') {
    collectionSlug = await collectionSlugOrHandler(resource);
  }

  return {
    url: getMenuItemStorefrontUrl(
      theme,
      pageId,
      slug,
      collectionSlug as string,
    ),
    resource,
  };
}