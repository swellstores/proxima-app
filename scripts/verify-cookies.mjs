// Real Astro cookie serialization and installed themes/core clients; commerce Fetch is intercepted.
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const { AstroCookies } = await import(new URL('./dist/core/cookies/cookies.js', import.meta.resolve('astro/package.json')));
const fixture = await mkdtemp(`${root}.cookie-test-`);
const originalFetch = globalThis.fetch;
try {
  await build({
    stdin: { contents: `export {initSwell,initSwellTheme,updateSwellDataCookie,deleteCookie} from './frontend/src/swell.ts';`, resolveDir: root },
    tsconfig: `${root}frontend/tsconfig.json`, bundle: true, platform: 'node',
    format: 'esm', packages: 'external', outfile: `${fixture}/swell.mjs`, logLevel: 'silent',
  });
  const { initSwell, initSwellTheme, updateSwellDataCookie, deleteCookie } = await import(pathToFileURL(`${fixture}/swell.mjs`));
  let sequence = 0;
  function context(data = { 'swell-session': 'old', 'swell-currency': 'USD' }, themeId = `cookies-${sequence++}`) {
    const request = new Request('https://app.invalid', { headers: {
      Cookie: `swell-data=${encodeURIComponent(JSON.stringify(data))}`,
      'Swell-Store-Id': 'fixture', 'Swell-Access-Token': 'token', 'Swell-Public-Key': 'key',
      'Swell-API-Host': 'https://api.invalid', 'Swell-Admin-Url': 'https://fixture.invalid',
      'Swell-Theme-Id': themeId,
    } });
    return { url: new URL(request.url), request, locals: {}, cookies: new AstroCookies(request) };
  }
  function assertSessionCookie(ctx) {
    const headers = [...ctx.cookies.headers()];
    assert.equal(headers.length, 1);
    assert.match(headers[0], /^swell-data=/);
    // Preserve the existing policy exactly, including the legacy lowercase samesite omission.
    assert.equal(headers[0].slice(headers[0].indexOf(';')), '; Path=/');
  }

  const ctx = context();
  const swell = initSwell(ctx);
  globalThis.fetch = async (_url, { headers }) => {
    assert.equal(headers['X-Session'], 'old');
    return Response.json({ id: 'cart' }, { headers: { 'X-Session': 'rotated %=;' } });
  };
  assert.equal((await swell.storefront.get('/cart')).id, 'cart');
  swell.storefront.setCookie('swell-locale', 'fr');
  assert.deepEqual(ctx.cookies.get('swell-data').json(), {
    'swell-session': 'rotated %=;', 'swell-currency': 'USD', 'swell-locale': 'fr',
  });
  assertSessionCookie(ctx);
  updateSwellDataCookie(ctx, JSON.stringify({ 'swell-currency': 'EUR' }));
  assert.equal(swell.storefront.getCookie('swell-currency'), 'EUR');
  assertSessionCookie(ctx);
  swell.storefront.session.setCookie('next');
  assertSessionCookie(ctx);
  deleteCookie(ctx, 'swell-session');
  assert.equal(swell.storefront.session.getCookie(), undefined);
  assert.equal(swell.storefront.getCookie('swell-locale'), 'fr');
  assertSessionCookie(ctx);

  // A subsequent request sees the state actually serialized for the browser.
  swell.storefront.session.setCookie('browser-session');
  const nextRequest = new Request('https://app.invalid', { headers: { Cookie: [...ctx.cookies.headers()][0].split(';')[0] } });
  const next = { ...context(), cookies: new AstroCookies(nextRequest) };
  assert.equal(initSwell(next).storefront.session.getCookie(), 'browser-session');

  for (const state of ['render', 'response', 'astro']) {
    const late = context();
    const client = initSwell(late);
    if (state === 'render') {
      late.locals.swell = client;
      late.locals.theme = {};
      await initSwellTheme(late);
      assert.equal(client.sentResponse, true);
    } else if (state === 'response') late.response = {};
    else Reflect.set(late.request, Symbol.for('astro.responseSent'), true);
    globalThis.fetch = async () => Response.json({ id: 'cart' }, { headers: { 'X-Session': 'late' } });
    assert.equal((await client.storefront.get('/cart')).id, 'cart');
    assert.equal(client.storefront.session.getCookie(), 'old');
    assert.deepEqual([...late.cookies.headers()], []);
  }

  const custom = context();
  let callback;
  const customClient = initSwell(custom, { setCookie: (...args) => { callback = args; } });
  customClient.storefront.session.setCookie('skipped');
  assert.deepEqual(callback.slice(0, 3), ['swell-session', 'skipped', undefined]);
  assert.equal(callback[3], customClient);
  assert.equal(customClient.storefront.session.getCookie(), 'old');
  const noWriter = initSwell(context(), { setCookie: undefined });
  noWriter.storefront.session.setCookie('skipped');
  assert.equal(noWriter.storefront.session.getCookie(), 'old');

  // A warm cache serves its value without replaying the first response's session.
  // Its background revalidation may rotate a session after rendering started.
  const background = [];
  const cacheId = `cache-${Date.now()}`;
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return Response.json({ results: [{ id: 'product' }] }, { headers: { 'X-Session': `cache-${calls}` } });
  };
  const cold = context({}, cacheId);
  const coldClient = initSwell(cold);
  await coldClient.storefront.products.list();
  assert.equal(coldClient.storefront.session.getCookie(), 'cache-1');
  const warm = context({}, cacheId);
  const warmClient = initSwell(warm, { workerCtx: { waitUntil: task => background.push(task) } });
  warmClient.sentResponse = true;
  assert.equal((await warmClient.storefront.products.list()).results[0].id, 'product');
  await Promise.all(background);
  assert.equal(calls, 2);
  assert.equal(warmClient.storefront.session.getCookie(), undefined);
  assert.deepEqual([...warm.cookies.headers()], []);
  console.log('Proxima cookies: serialization, rotation, merge/delete, browser handoff, three late-write paths, callback compatibility and cache revalidation passed');
} finally {
  globalThis.fetch = originalFetch;
  await rm(fixture, { recursive: true, force: true });
}
