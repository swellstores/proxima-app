/* eslint-disable @typescript-eslint/no-base-to-string */
import { initSwellTheme } from '@/swell';

import {
  PageNotFound,
  type ShopifyRobots,
  type ThemeGlobals,
} from '@swell/apps-sdk';
import type { APIRoute } from 'astro';

export const GET: APIRoute = async (context) => {
  const { theme } = await initSwellTheme(context);

  theme.globals = {} as unknown as ThemeGlobals;
  await theme.initGlobals('robots.txt');

  let output: string;

  try {
    const result = await theme.renderPage();

    if (typeof result !== 'string') {
      throw new PageNotFound();
    }

    output = result;
  } catch (err) {
    if (!(err instanceof PageNotFound)) {
      throw err;
    }

    output = (theme.globals.robots as ShopifyRobots).default_groups
      .map((group) => {
        const list: string[] = [String(group.user_agent.valueOf())];

        for (const rule of group.rules) {
          list.push(String(rule.valueOf()));
        }

        if (group.sitemap) {
          list.push(String(group.sitemap.valueOf()));
        }

        return list.join('\n');
      })
      .join('\n');
  }

  return new Response(output);
};
