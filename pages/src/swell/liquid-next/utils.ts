/**
 * Utils used by liquidjs tags and filters
 */
export class Drop {
  liquidMethodMissing(key: string) {
    return undefined;
  }
}

export class ForloopDrop extends Drop {
  public i: number;
  public length: number;
  public name: string;

  constructor(length: number, collection: string, variable: string) {
    super();
    this.i = 0;
    this.length = length;
    this.name = `${variable}-${collection}`;
  }
  next() {
    this.i++;
  }
  index0() {
    return this.i;
  }
  index() {
    return this.i + 1;
  }
  first() {
    return this.i === 0;
  }
  last() {
    return this.i === this.length - 1;
  }
  rindex() {
    return this.length - this.i;
  }
  rindex0() {
    return this.length - this.i - 1;
  }
  valueOf() {
    return JSON.stringify(this);
  }
}

export function toValue(value: any) {
  return value instanceof Drop && isFunction(value.valueOf)
    ? value.valueOf()
    : value;
}

export function isString(value: any) {
  return typeof value === "string";
}

export function isNumber(value: any) {
  return typeof value === "number";
}

export function isFunction(value: any) {
  return typeof value === "function";
}

export function toLiquid(value: any) {
  if (value && isFunction(value.toLiquid)) return toLiquid(value.toLiquid());
  return value;
}

export function isNil(value: any) {
  return value == null;
}

export function isUndefined(value: any) {
  return value === undefined;
}

export function isArray(value: any) {
  // be compatible with IE 8
  return String(value) === "[object Array]";
}

export function isObject(value: any) {
  const type = typeof value;
  return value !== null && (type === "object" || type === "function");
}

export function isIterable(value: any) {
  return isObject(value) && Symbol.iterator in value;
}

export function toEnumerable(val: any) {
  val = toValue(val);
  if (isArray(val)) return val;
  if (isString(val) && val.length > 0) return [val];
  if (isIterable(val)) return Array.from(val);
  if (isObject(val))
    // Converting keyed objects to an array with id is required for Shopify compatibility
    return Object.keys(val).reduce(
      (acc: any, key) => [...acc, { id: key, ...val[key] }],
      [],
    ); //map((key) => [key, val[key]]);
  return [];
}
