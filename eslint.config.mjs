import js from '@eslint/js';
import { resolve } from 'node:path';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import { FlatCompat } from '@eslint/eslintrc';
const compat = new FlatCompat({ baseDirectory: import.meta.dirname });
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
  ...compat.extends('next/core-web-vitals'),
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
  { settings: { next: { rootDir: resolve(import.meta.dirname, 'frontend') } } },
  prettier,
];

export default config;
