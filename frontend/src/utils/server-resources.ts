export async function parseResources(
  data: Record<string, any>,
): Promise<Record<string, any>> {
  const result: Record<string, any> = {};

  for (const [key, value] of Object.entries(data)) {
    if (value && typeof value === 'object' && 'resolve' in value) {
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
