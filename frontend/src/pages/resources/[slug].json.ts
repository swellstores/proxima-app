import { handleServerRequest } from '@/utils/server';

import * as resources from '@/resources';

export const GET = handleServerRequest(
  async ({ swell, theme, params, context }) => {
    const { slug: resource_slug } = context.params as {
      slug: keyof typeof resources;
    };

    const { path, slug = '', query = {} } = params;

    const Resource = resources[resource_slug];

    let resource;

    if (path) {
      resource = await new Resource(swell, slug, query)[path.replace('/', '.')];
      resource = await resource.resolveWithMetadata();
    } else {
      resource = await new Resource(
        swell,

        slug,
        query,
      ).resolveWithMetadata();
    }

    return resource;
  },
);
