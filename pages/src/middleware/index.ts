import { sequence } from 'astro:middleware';
import { performLogin, performLogout, ensureAccountLoggedIn } from './account';

export const onRequest = sequence(
  performLogin,
  performLogout,
  ensureAccountLoggedIn,
);
