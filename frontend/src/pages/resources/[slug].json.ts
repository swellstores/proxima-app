import { handleServerRequest } from '@/utils/server';

import * as resources from '@/resources';

export const GET = handleServerRequest(async ({ swell, params, context }) => {
  const { slug: resource_slug } = context.params as {
    slug: keyof typeof resources;
  };

  const { path, slug = '' } = params;
  const query = JSON.parse(params.query);

  const Resource = resources[resource_slug];

  let resource;

  if (path) {
    resource = await new Resource(swell, slug, query)[path.replace('/', '.')];
    resource = await resource.resolve(false);
  } else {
    resource = await new Resource(swell, slug, query).resolve(false);
  }

  return resource ?? null;
});
