import { sequence } from 'astro:middleware';
import { htmlCacheMiddleware } from './html-cache';
import { initLogger } from './logger';
import globalRoutes from './route';
import { formRoutes, restoreThemeRequestData } from './form';
import accountRoutes from './account';
import cartRoutes from './cart';
import { assetCacheRead, assetRender } from './asset';

export const onRequest = sequence(
  initLogger,
  htmlCacheMiddleware,
  assetCacheRead,
  ...globalRoutes,
  ...accountRoutes,
  ...cartRoutes,
  ...formRoutes,
  assetRender,
  restoreThemeRequestData,
);
