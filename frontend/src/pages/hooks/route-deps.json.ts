// ABOUTME: Dev/ops endpoint to return route → collections dependencies
// ABOUTME: Cached via HtmlCache using JSON content-type path rule

import { handleServerRequest } from '@/utils/server';
import { getPageDependencies } from '@swell/apps-sdk';

export const GET = handleServerRequest(async ({ swell, theme, context }) => {
  // This endpoint is safe to expose; caching handled by HtmlCache middleware
  const result: Record<string, string[]> = {};
  const pages = Array.isArray(theme.props.pages) ? theme.props.pages : [];
  for (const page of pages) {
    const deps = await getPageDependencies(theme, page.id, {
      includePotential: true,
      includeLayout: true,
    });
    if (page.url) {
      result[page.url] = deps;
    }
  }

  const format = context.url.searchParams.get('format');
  if (format === 'reverse') {
    const reverse: Record<string, string[]> = {};
    for (const [route, collections] of Object.entries(result)) {
      for (const col of collections) {
        (reverse[col] ||= []).push(route);
      }
    }
    // Optionally sort routes per collection for stability
    for (const key of Object.keys(reverse)) {
      reverse[key].sort();
    }
    return reverse;
  }

  return result;
});
