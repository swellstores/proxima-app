import { initSwell } from '@/swell';
import { createHtmlCache } from '@/utils/html-cache';

import type { APIContext, APIRoute } from 'astro';
import type { HtmlCache, Swell } from '@swell/apps-sdk';

interface SitemapFile {
  index: number;
  content: string;
  lastmod: string | null;
}

interface SitemapLink {
  url: string;
  lastmod: string | null;
}

export const GET: APIRoute = async (context) => {
  const index = context.params.id ? Number.parseInt(context.params.id) : 0;

  if (!Number.isFinite(index) || index < 0) {
    return new Response(null, { status: 404 });
  }

  const host =
    context.request.headers.get('x-forwarded-host') ||
    context.request.headers.get('host') ||
    context.url.host;

  const htmlCache = createHtmlCache(context);

  if (index > 0 && htmlCache) {
    const mainUrl = new URL(context.url);
    mainUrl.pathname = '/sitemap.xml';

    const cached = await htmlCache.get(
      new Request(mainUrl, {
        method: 'GET',
        headers: htmlCache.getCacheKeyHeaders(context.request.headers),
      }),
    );

    if (cached?.found && cached.response) {
      const pagesCount = Number.parseInt(
        cached.response.headers.get('X-Pages-Count') ?? '0',
      );

      if (pagesCount <= 1 || pagesCount < index) {
        return new Response(null, { status: 404 });
      }
    }
  }

  const files = await collectSiteLinks(initSwell(context)).then((links) =>
    generateSitemapFiles(`${context.url.protocol}//${host}`, links),
  );

  if (htmlCache) {
    await cacheSitemapFiles(context, htmlCache, files);
  }

  if (index >= files.length) {
    return new Response(null, { status: 404 });
  }

  const file = files[index];

  const headers = new Headers([
    ['Content-Type', 'application/xml'],
    [
      'Last-Modified',
      (file.lastmod ? new Date(file.lastmod) : new Date()).toUTCString(),
    ],
  ]);

  if (index === 0 && files.length > 1) {
    headers.set('X-Pages-Count', String(files.length - 1));
  }

  return new Response(file.content, {
    status: 200,
    headers,
  });
};

async function getCategoriesLinks(
  swell: Swell,
  results: SitemapLink[],
): Promise<void> {
  const query = {
    page: 1,
    limit: 100,
    fields: ['slug', 'date_updated', 'date_created'],
  };

  let response = await swell.storefront.categories.list(query);

  do {
    for (const item of response.results) {
      results.push({
        url: `/categories/${item.slug}`,
        lastmod: item.date_updated || item.date_created || null,
      });
    }

    if (query.page >= (response.page_count || 0)) {
      break;
    }

    query.page += 1;
    response = await swell.storefront.categories.list(query);
  } while (response.results.length > 0);
}

async function getProductsLinks(
  swell: Swell,
  results: SitemapLink[],
): Promise<void> {
  const query = {
    page: 1,
    limit: 100,
    fields: ['slug', 'date_updated', 'date_created'],
  };

  let response = await swell.storefront.products.list(query);

  do {
    for (const item of response.results) {
      results.push({
        url: `/products/${item.slug}`,
        lastmod: item.date_updated || item.date_created || null,
      });
    }

    if (query.page >= (response.page_count || 0)) {
      break;
    }

    query.page += 1;
    response = await swell.storefront.products.list(query);
  } while (response.results.length > 0);
}

async function getContentLinks(
  swell: Swell,
  source: string,
  target: string,
  results: SitemapLink[],
): Promise<void> {
  const query = {
    page: 1,
    limit: 100,
    fields: ['slug', 'date_updated', 'date_created'],
  };

  let response = await swell.storefront.content.list(source, query);

  do {
    for (const item of response.results) {
      results.push({
        url: `${target}/${item.slug}`,
        lastmod: item.date_updated || item.date_created || null,
      });
    }

    if (query.page >= (response.page_count || 0)) {
      break;
    }

    query.page += 1;
    response = await swell.storefront.content.list(source, query);
  } while (response.results.length > 0);
}

interface SwellBlogCategory {
  id: string;
  slug: string;
}

interface SwellBlog {
  id: string;
  slug: string;
  category_id: string;
  category?: SwellBlogCategory;
  date_created: string;
  date_updated?: string;
}

async function getBlogsLinks(
  swell: Swell,
  source: string,
  results: SitemapLink[],
): Promise<void> {
  const query = {
    page: 1,
    limit: 100,
    fields: [
      'slug',
      'category_id',
      'category.id',
      'category.slug',
      'date_updated',
      'date_created',
    ],
  };

  let response = await swell.storefront.content.list(source, query);

  do {
    for (const item of response.results as SwellBlog[]) {
      results.push({
        url: `/blogs/${item.category?.slug ?? item.category_id}/${item.slug}`,
        lastmod: item.date_updated || item.date_created || null,
      });
    }

    if (query.page >= (response.page_count || 0)) {
      break;
    }

    query.page += 1;
    response = await swell.storefront.content.list(source, query);
  } while (response.results.length > 0);
}

async function collectSiteLinks(swell: Swell): Promise<SitemapLink[]> {
  const links: SitemapLink[] = [
    { url: '/', lastmod: null },
    { url: '/categories', lastmod: null },
    { url: '/products', lastmod: null },
    { url: '/blogs', lastmod: null },
  ];

  await Promise.all([
    getContentLinks(swell, 'pages', '/pages', links),
    getContentLinks(swell, 'blog-categories', '/blogs', links),
    getBlogsLinks(swell, 'blogs', links),
    getCategoriesLinks(swell, links),
    getProductsLinks(swell, links),
  ]);

  // Sort links: first without date, then with oldest date, last with newest date.
  links.sort((a, b) => {
    if (a.lastmod === null) {
      if (b.lastmod === null) {
        return a.url.localeCompare(b.url);
      }

      return -1;
    }

    if (b.lastmod === null) {
      return 1;
    }

    const r = a.lastmod.localeCompare(b.lastmod);

    if (r !== 0) {
      return r;
    }

    return a.url.localeCompare(b.url);
  });

  return links;
}

const SITEMAP_MAX_LINKS_COUNT = 50000;

function generateSitemapFiles(
  baseUrl: string,
  links: SitemapLink[],
): SitemapFile[] {
  if (links.length <= SITEMAP_MAX_LINKS_COUNT) {
    const [content, lastmod] = compileSitemapLinks(baseUrl, links);

    return [
      {
        index: 0,
        content,
        lastmod,
      },
    ];
  }

  const count = Math.ceil(links.length / SITEMAP_MAX_LINKS_COUNT);
  const files: SitemapFile[] = [];
  let lastDate: string = '0';

  for (let i = 0; i < count; ++i) {
    const start = i * SITEMAP_MAX_LINKS_COUNT;

    const [content, lastmod] = compileSitemapLinks(
      baseUrl,
      links.slice(start, start + SITEMAP_MAX_LINKS_COUNT),
    );

    if (lastmod !== null && lastmod.localeCompare(lastDate)) {
      lastDate = lastmod;
    }

    files.push({
      index: i + 1,
      content,
      lastmod,
    });
  }

  files.unshift({
    index: 0,
    content: wrapSitemapIndex(baseUrl, files),
    lastmod: lastDate === '0' ? null : lastDate,
  });

  return files;
}

function escapeUrl(str: string): string {
  return encodeURI(str).replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '&':
        return '&amp;';
      case "'":
        return '&apos;';
      case '"':
        return '&quot;';
      default:
        return c;
    }
  });
}

function compileSitemapLinks(
  baseUrl: string,
  links: SitemapLink[],
): [content: string, lastmod: string | null] {
  let lastmod = '0';

  const content = wrapSitemapContent(
    links
      .reduce((acc: string[], link) => {
        acc.push(
          `<url><loc>${escapeUrl(baseUrl + link.url)}</loc>${link.lastmod ? `<lastmod>${link.lastmod}</lastmod>` : ''}</url>`,
        );

        if (link.lastmod !== null && link.lastmod.localeCompare(lastmod) > 0) {
          lastmod = link.lastmod;
        }

        return acc;
      }, [])
      .join('\n'),
  );

  return [content, lastmod === '0' ? null : lastmod];
}

function wrapSitemapContent(content: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${content}
</urlset>`;
}

function wrapSitemapIndex(baseUrl: string, files: SitemapFile[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${files.map((file) => `<sitemap><loc>${escapeUrl(baseUrl + `/sitemap${file.index}.xml`)}</loc>${file.lastmod ? `<lastmod>${file.lastmod}</lastmod>` : ''}</sitemap>`).join('\n')}
</sitemapindex>`;
}

async function cacheSitemapFiles(
  context: APIContext,
  htmlCache: HtmlCache,
  files: SitemapFile[],
): Promise<void> {
  const promises: Promise<void>[] = [];
  // Background cache write
  const ctx = context.locals.runtime?.ctx;

  for (const file of files) {
    const url = new URL(context.url);
    url.pathname =
      file.index > 0 ? `/sitemap${file.index}.xml` : '/sitemap.xml';

    const request = new Request(url, {
      method: 'GET',
      headers: htmlCache.getCacheKeyHeaders(context.request.headers),
    });

    const headers = new Headers([
      ['Content-Type', 'application/xml'],
      [
        'Last-Modified',
        (file.lastmod ? new Date(file.lastmod) : new Date()).toUTCString(),
      ],
    ]);

    if (file.index === 0 && files.length > 1) {
      headers.set('X-Pages-Count', String(files.length - 1));
    }

    const response = new Response(file.content, {
      status: 200,
      headers,
    });

    if (htmlCache.canWriteToCache(request, response)) {
      const promise = htmlCache.put(request, response);

      if (typeof ctx?.waitUntil === 'function') {
        ctx.waitUntil(promise);
      } else {
        promises.push(promise);
      }
    }
  }

  if (promises.length > 0) {
    await Promise.all(promises);
  }
}
