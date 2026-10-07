// See https://prettier.io/docs/en/configuration

/** @type {import('prettier').Config} */
export default {
  singleQuote: true,
  trailingComma: 'all',
  printWidth: 120,
  arrowParens: 'avoid',
  overrides: [
    {
      files: '*.config.{js,mjs,ts}',
      options: {
        quoteProps: 'consistent',
      },
    },
  ],
};
