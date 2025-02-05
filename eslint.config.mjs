// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import pluginJest from 'eslint-plugin-jest';
import pluginPrettierRecommended from 'eslint-plugin-prettier/recommended';

export default tseslint.config(
  {
    // config with just ignores is the replacement for `.eslintignore`
    ignores: [
      'frontend/dist/',
      'frontend/.wrangler/',
      'frontend/.astro/',
      'frontend/worker-configuration.d.ts',
    ],
  },
  eslint.configs.recommended,
  tseslint.configs.recommendedTypeChecked.map((config) => ({
    ...config,
    files: ['**/*.ts'],
  })),
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir:
          // eslint-disable-next-line no-undef
          typeof __dirname === 'string' ? __dirname : import.meta.dirname,
      },
    },
  },
  {
    files: ['**/*.test.ts'],
    ...pluginJest.configs['flat/recommended'],
  },
  pluginPrettierRecommended,
);
