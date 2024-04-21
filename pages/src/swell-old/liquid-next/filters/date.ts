import { date } from 'astro/zod';
import { LiquidSwell } from '..';
import { paramsToProps } from '../utils';
import strftime from 'strftime';

// {{ blog.date_published | date: '%B %d, %Y' }}

export default function bind(_liquidSwell: LiquidSwell) {
  return (dateValue: string, maybeParams: any, params?: any[]) => {
    const date = ensureDate(dateValue);
    const { format, strFormat } = getDateFilterParams(maybeParams, params);

    let formattedDate = date;
    if (strFormat) {
      formattedDate = strftime(strFormat, date);
    } else if (format) {
      formattedDate = applyDateFormat(format, date);
    }

    return formattedDate;
  };
}

export function ensureDate(dateValue: string | Date) {
  if (dateValue === 'now' || dateValue === 'today') {
    return new Date();
  }
  if (dateValue instanceof Date) {
    return dateValue;
  }
  if (typeof dateValue === 'string') {
    return new Date(dateValue);
  }

  return new Date();
}

export function getDateFilterParams(maybeParams: any, params?: any[]) {
  const actualParams = Array.isArray(maybeParams) ? maybeParams : params;
  const strFormat = typeof maybeParams === 'string' ? maybeParams : undefined;
  const { format, datetime } = paramsToProps(actualParams as any[]);

  return { format, datetime, strFormat };
}

export function applyDateFormat(type: string, date: Date) {
  switch (type) {
    case 'abbreviated_date':
      // Apr 3, 2024
      return strftime('%b %d, %Y', date);
    case 'basic':
      // 04/03/2024
      return strftime('%m/%d/%Y', date);
    case 'date':
      // April 3, 2024
      return strftime('%B %d, %Y', date);
    case 'date_at_time':
      // April 3, 2024 at 12:00 pm
      return `${strftime('%B %d, %Y', date)} at ${strftime('%I:%M %P', date)}`;
    case 'default':
      // Wednesday, April 3, 2024 at 1:40 pm -0400
      return strftime('%A, %B %d, %Y at %I:%M %P %z', date);
    case 'on_date':
      // on Apr 3, 2024
      return `on ${strftime('%b %d, %Y', date)}`;
    case 'short': // deprecated by shopify
      // 3 Apr 13:40
      return strftime('%-d %b %H:%M', date);
    case 'long': // deprecated by shopify
      // April 3, 2024 13:40
      return strftime('%B %d, %Y %H:%M', date);
    default:
      // TODO: support custom date formats from theme locale settings
      return date;
  }
}

export function applyStrftimeFormat(format: string, date: Date) {
  return strftime(format, date);
}
