import { sequence } from 'astro:middleware';
import { shopifyRouteCompatibility } from './route';
import {
  postLogin,
  postLogout,
  postCreateAccount,
  validateAccountResetKey,
  postAccountReset,
  ensureAccountLoggedIn,
  postCreateOrUpdateAddress,
} from './account';
import { restoreThemeRequestData } from './form';

export const onRequest = sequence(
  shopifyRouteCompatibility,
  postLogin,
  postLogout,
  postCreateAccount,
  validateAccountResetKey,
  postAccountReset,
  ensureAccountLoggedIn,
  postCreateOrUpdateAddress,
  restoreThemeRequestData,
);
