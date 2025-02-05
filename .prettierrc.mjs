/** @type {import("prettier").Config} */
export default {
  bracketSpacing: true,
  bracketSameLine: true,
  trailingComma: 'all',
  arrowParens: 'always',
  printWidth: 80,
  semi: true,
  singleQuote: true,
  endOfLine: 'lf',
  tabWidth: 2,
  useTabs: false,
  plugins: ['prettier-plugin-astro'],
  overrides: [
    {
      files: '*.astro',
      options: {
        parser: 'astro',
      },
    },
  ],
};
