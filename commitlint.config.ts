import type { Plugin, RulesConfig, UserConfig } from '@commitlint/types';

const gitlintPlugin = {
  rules: {
    'hard-tab': ({ header, body, footer }) => {
      const message = 'cannot contain hard tab character (\\t)';
      switch (true) {
        case Boolean(header?.includes('\t')):
          return [false, `header ${message}`];
        case body?.includes('\t'):
          return [false, `body ${message}`];
        case footer?.includes('\t'):
          return [false, `footer ${message}`];
        default:
          return [true];
      }
    },
    'body-trim-trailing': ({ body }) => {
      const noTrailingSpace = !body || body === body.trimEnd();
      return [noTrailingSpace, 'body cannot have trailing whitespace'];
    },
  },
} satisfies Plugin;

/**
 * @see https://commitlint.js.org/reference/rules.html
 * @see https://jorisroovers.com/gitlint/latest/rules/builtin_rules/
 */
const gitlintRules = {
  // T1: title-max-length (72 chars)
  'header-max-length': [2, 'always', 72],
  // T2: title-trailing-whitespace
  // T6: title-leading-whitespace
  'header-trim': [2, 'always'],
  // T4: title-hard-tab
  // B3: body-hard-tab
  'hard-tab': [2, 'never'],
  // B2: body-trailing-whitespace
  'body-trim-trailing': [2, 'never'],
  // B4: body-first-line-empty
  'body-leading-blank': [2, 'always'],
  // CCL1: soft-body-max-line-length (80 chars)
  'body-max-line-length': [2, 'always', 80],
} satisfies Partial<RulesConfig>;

const configuration: UserConfig = {
  extends: ['@commitlint/config-conventional'],
  plugins: [
    {
      rules: {
        ...gitlintPlugin.rules,
      },
    },
  ],
  rules: {
    ...gitlintRules,
    'body-empty': [1, 'never'],
  },
};

export default configuration;
