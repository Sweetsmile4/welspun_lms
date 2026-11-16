import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import next from 'eslint-config-next/core-web-vitals';
import prettier from 'eslint-config-prettier/flat';
const config = [
  {
    ignores: [
      '**/node_modules/**',
      '**/.next/**',
      '**/dist/**',
      '**/next-env.d.ts',
      '**/coverage/**',
      'playwright-report/**',
      'test-results/**',
      'work/**',
      '.worktrees/**',
      'tmp/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_' },
      ],
    },
  },
  ...next,
  {
    files: ['frontend/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            '@welspun/api',
            '@welspun/api/*',
            '**/backend/**',
            '**/backend/worker/**',
          ],
        },
      ],
    },
  },
  {
    files: ['packages/contracts/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            '@welspun/api',
            '@welspun/api/*',
            'mongoose',
            'pino',
            'node:*',
          ],
        },
      ],
    },
  },
  { settings: { next: { rootDir: 'frontend/' } } },
  prettier,
];

export default config;
