import { handleServerRequest } from '@/utils/server';

import * as resources from '@/resources';

export const GET = handleServerRequest(
  async ({ swell, theme, params, context }) => {
    const { slug: resource_slug } = context.params as {
      slug: keyof typeof resources;
    };

    let { path, slug = '', query = {} } = params;
    query = JSON.parse(query);

    const Resource = resources[resource_slug];

    let resource;

    if (path) {
      resource = await new Resource(swell, slug, query)[path.replace('/', '.')];
      resource = await resource.resolve(false);
    } else {
      resource = await new Resource(swell, slug, query).resolve(false);
    }

    console.log('get resource', slug, query);

    return resource;
  },
);
