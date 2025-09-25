import { handleMiddlewareRequest } from '@/utils/server';

// Flatten v4-style ".json" endpoints by rewriting to "/index.json" when needed.
// Example:
//   /products.json -> /products/index.json
const flattenIndexJson = handleMiddlewareRequest(
  'GET',
  (pathname) => pathname.endsWith('.json') && !pathname.endsWith('/index.json'),
  async ({ context }, next) => {
    const res = await next();
    const contentType = res?.headers?.get('Content-Type') || '';
    const isJson = contentType.toLowerCase().includes('application/json');

    if (res && res.status !== 404 && isJson) {
      return res;
    }

    // On 404 or non-JSON response, rewrite `/a/b.json` -> `/a/b/index.json`, preserving query string
    const { pathname, search } = context.url;
    const target = pathname.replace(/\.json$/, '/index.json') + (search || '');
    return context.rewrite(target);
  },
);

export default [flattenIndexJson];
