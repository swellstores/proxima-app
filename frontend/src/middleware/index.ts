import { sequence } from 'astro:middleware';
import { initLogger } from './logger';
import globalRoutes from './route';
import { formRoutes, restoreThemeRequestData } from './form';
import accountRoutes from './account';
import cartRoutes from './cart';

export const onRequest = sequence(
  initLogger,
  ...globalRoutes,
  ...accountRoutes,
  ...cartRoutes,
  ...formRoutes,
  restoreThemeRequestData,
);
