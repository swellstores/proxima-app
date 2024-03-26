import { Swell, SwellStorefrontCollection, SwellStorefrontRecord } from './api';

export async function getContentModel(
  swell: Swell,
  name: string,
): Promise<any> {
  return await swell.getCached('content-model', [name], () =>
    swell.get('/:content/{name}', {
      name,
      public: true,
      'storefront.enabled': true,
    }),
  );
}

export async function getContentList(
  swell: Swell,
  type: string,
  query?: SwellData,
): Promise<any> {
  return new SwellStorefrontCollection(swell, `content/${type}`, query);
}

export async function getContentEntry(
  swell: Swell,
  type: string,
  id: string,
  query?: SwellData,
): Promise<any> {
  return new SwellStorefrontRecord(swell, `content/${type}`, id, query);
}

export async function getPage(
  swell: Swell,
  id: string,
  query?: object,
): Promise<any> {
  return await getContentEntry(swell, 'pages', id, query);
}

export async function getBlogs(swell: Swell, query?: object): Promise<any> {
  return await getContentList(swell, 'blogs', query);
}

export async function getBlog(
  swell: Swell,
  id: string,
  query?: object,
): Promise<any> {
  return await getContentEntry(swell, 'blogs', id, query);
}
