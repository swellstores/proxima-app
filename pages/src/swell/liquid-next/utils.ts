import { Context } from 'liquidjs';

export const toString = Object.prototype.toString;
export const hasOwnProperty = Object.hasOwnProperty;

/**
 * Utils used by liquidjs tags and filters
 */
export class Drop {
  liquidMethodMissing(key: string) {
    return undefined;
  }
}

// Note: has to refactor this to use class props instead of methods for some reason
// The class methods weren't working in our implementation
export class ForloopDrop extends Drop {
  public i: number;
  public length: number;
  public name: string;
  public test: string = 'test';
  public index: number;
  public index0: number;
  public first: boolean;
  public last: boolean;
  public rindex: number;
  public rindex0: number;

  constructor(length: number, collection: string, variable: string) {
    super();
    this.length = length;
    this.name = `${variable}-${collection}`;
    this.i = 1;
    this.index = 0;
    this.index0 = 0;
    this.first = true;
    this.last = false;
    this.rindex = length;
    this.rindex0 = length - 1;
  }

  next() {
    this.i++;
    this.index++;
    this.index0++;
    this.first = this.index === 0;
    this.last = this.i === this.length;
    this.rindex--;
    this.rindex0--;
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
  return typeof value === 'string';
}

export function isNumber(value: any) {
  return typeof value === 'number';
}

export function isFunction(value: any) {
  return typeof value === 'function';
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
  return toString.call(value) === '[object Array]';
}

export function isObject(value: any) {
  const type = typeof value;
  return value !== null && (type === 'object' || type === 'function');
}

export function isIterable(value: any) {
  return isObject(value) && Symbol.iterator in value;
}

export function isTruthy(val: any, ctx: Context): boolean {
  return !isFalsy(val, ctx);
}

export function isFalsy(val: any, ctx: Context): boolean {
  if (ctx.opts.jsTruthy) {
    return !val;
  } else {
    return val === false || undefined === val || val === null;
  }
}

export interface Comparable {
  equals: (rhs: any) => boolean;
  gt: (rhs: any) => boolean;
  geq: (rhs: any) => boolean;
  lt: (rhs: any) => boolean;
  leq: (rhs: any) => boolean;
}

export function isComparable(arg: any): arg is Comparable {
  return arg && isFunction(arg.equals);
}

export function toArray(val: any) {
  if (isNil(val)) return [];
  if (isArray(val)) return val;
  return [val];
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

export function stringify(value: any): string {
  value = toValue(value);
  if (isString(value)) return value;
  if (isNil(value)) return '';
  if (isArray(value)) return value.map((x: any) => stringify(x)).join('');
  return String(value);
}

export function paramsToProps(params: any[]) {
  // Convert array formatted params to props object
  return params?.reduce((acc: any, param: any, index: number) => {
    if (index % 2 === 0) {
      acc[param] = params[index + 1];
    }
    return acc;
  }, {});
}
