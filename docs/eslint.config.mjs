import { config } from '@smartive/eslint-config';

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...config('typescript'),
  {
    files: ['**/*.{ts,tsx,js,jsx,mjs}'],
    settings: {
      'import/resolver': {
        node: {
          extensions: ['.js', '.jsx', '.ts', '.tsx'],
        },
        typescript: {
          alwaysTryTypes: true,
        },
      },
    },
    rules: {
      'import/no-unresolved': [
        'error',
        {
          ignore: ['^@theme', '^@docusaurus', '^@site'],
        },
      ],
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
    },
  },
];
