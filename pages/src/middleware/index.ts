import { sequence } from 'astro:middleware';
import globalRoutes from './route';
import { formRoutes, restoreThemeRequestData } from './form';
import accountRoutes from './account';
import cartRoutes from './cart';

export const onRequest = sequence(
  ...globalRoutes,
  ...accountRoutes,
  ...cartRoutes,
  ...formRoutes,
  restoreThemeRequestData,
);
