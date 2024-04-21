import { LiquidSwell } from '..';
import { toArray, toValue, stringify, isComparable, isTruthy } from '../utils';

// {% assign specials = collection.products | where: 'special', true %}

export default function bind(_liquidSwell: LiquidSwell) {
  return function* where<T extends object>(
    this: any,
    arr: T[],
    property: string,
    expected?: any,
  ): IterableIterator<unknown> {
    const values: unknown[] = [];
    arr = toArray(toValue(arr));
    for (const item of arr) {
      values.push(
        yield this.context._getFromScope(
          item,
          stringify(property).replace(/\?$/, '').split('.'),
          false,
        ),
      );
    }
    return arr.filter((_, i) => {
      if (expected === undefined) return isTruthy(values[i], this.context);
      if (isComparable(expected)) return expected.equals(values[i]);
      return values[i] === expected;
    });
  };
}
