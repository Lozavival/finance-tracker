import js from '@eslint/js';
import typescriptPlugin from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import prettierPlugin from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';
import globals from 'globals';

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    /* Global ignores (replaces .eslintignore) */
    ignores: ['dist/', 'dist-electron/', 'release/', 'node_modules/', '.husky/'],
  },
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx,js,mjs,cjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        React: 'readonly',
      },
      parser: typescriptParser,
      parserOptions: {
        project: 'tsconfig.eslint.json',
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      '@typescript-eslint': typescriptPlugin,
      'react-hooks': reactHooksPlugin,
      'prettier': prettierPlugin,
    },
    rules: {
      ...typescriptPlugin.configs.recommended.rules,
      ...prettierConfig.rules,
      'prettier/prettier': 'error',

      /* React Hooks */
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      /* TypeScript rules */
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          args: 'all',
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/return-await': ['error', 'in-try-catch'],
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-misused-promises': 'off',
      '@typescript-eslint/no-explicit-any': 'off',

      /* JavaScript / Code Style rules */
      'class-methods-use-this': 'error',
      'no-console': 'error',
      'no-param-reassign': ['error', { props: false }],
      'no-var': 'error',
      'object-shorthand': 'error',
      'prefer-arrow-callback': 'error',
      'prefer-const': 'error',
      'prefer-destructuring': ['error', { array: false }],
      'prefer-numeric-literals': 'error',
      'prefer-rest-params': 'error',
      'prefer-spread': 'error',
      'prefer-template': 'error',
      'require-await': 'error',
      'spaced-comment': ['error', 'always', { markers: ['/'] }],
      'vars-on-top': 'error',

      /* Disabled rules */
      'no-undef': 'off', // Handled by TypeScript compiler
      'camelcase': 'off',
      'consistent-return': 'off',
      'no-continue': 'off',
      'no-empty': 'off',
      'no-nested-ternary': 'off',
      'no-return-await': 'off',
      'no-shadow': 'off',
      'no-underscore-dangle': 'off',
      'no-use-before-define': 'off',
      'no-useless-constructor': 'off',
      'prefer-for-of': 'off',
      'quote-props': 'off',
    },
  },
  {
    /* Rules specific for config files */
    files: ['*.config.{js,mjs,cjs,ts}'],
    rules: {
      '@typescript-eslint/no-var-requires': 'off',
    },
  },
];
