export async function parseResources(
  data: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (
      typeof value === 'object' &&
      value !== null &&
      'resolve' in value &&
      typeof value.resolve === 'function'
    ) {
      // TODO: perform the transformation in parallel
      result[key] = {
        _resource: value.constructor.name,
        value: await value.resolve(false, true),
      };
    } else {
      result[key] = value;
    }
  }

  return result;
}
