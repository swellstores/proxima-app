import { sequence } from 'astro:middleware';
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
  postLogin,
  postLogout,
  postCreateAccount,
  validateAccountResetKey,
  postAccountReset,
  ensureAccountLoggedIn,
  postCreateOrUpdateAddress,
  restoreThemeRequestData,
);
