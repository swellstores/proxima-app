import { LiquidSwell } from '..';
import {
  default as bindDate,
  ensureDate,
  getDateFilterParams,
  applyStrftimeFormat,
} from './date';

// {{ blog.date_published | time_tag: '%B %d, %Y' }}

export default function bind(_liquidSwell: LiquidSwell) {
  const dateFilter = bindDate(_liquidSwell);
  return (dateValue: string, maybeParams: any, params?: any[]) => {
    const date = ensureDate(dateValue);
    const formattedDate = dateFilter(dateValue, maybeParams, params);
    const { datetime } = getDateFilterParams(maybeParams, params);

    let formattedDatetime = date.toISOString?.();
    if (datetime) {
      formattedDatetime = applyStrftimeFormat(datetime, date);
    }

    return `<time datetime="${formattedDatetime}">${formattedDate}</time>`;
  };
}
