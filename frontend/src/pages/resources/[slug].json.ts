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

  // Use the factory function from apps-sdk to create the resource
  // This encapsulates all knowledge of constructor signatures within apps-sdk
  const instance = resources.createSwellResource(Resource, swell, slug, query);

  if (path) {
    resource = await instance[path.replace('/', '.')];
    resource = await resource.resolve(false);
  } else {
    resource = await instance.resolve(false);
  }

  return resource ?? null;
});
