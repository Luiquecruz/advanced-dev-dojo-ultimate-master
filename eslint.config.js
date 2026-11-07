import js from '@eslint/js';
import jsxA11y from 'eslint-plugin-jsx-a11y-x';
import reactHooks from 'eslint-plugin-react-hooks';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig(
  globalIgnores(['dist/', 'coverage/', 'vendor/', '.venv/', '.claude/worktrees/', 'src/content/*/**']),
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ['src/**/*.tsx'],
    extends: [reactHooks.configs.flat.recommended, jsxA11y.configs.recommended],
  },
  {
    files: ['plugins/**', 'scripts/**', 'worker/**', '.claude/hooks/**', '*.config.{js,ts}', 'src/verify/**'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['src/engines/**'],
    rules: {
      // The engines implement untyped runtime surfaces for learner code (Jest-like expect, CommonJS loader, Node built-ins).
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none', ignoreRestSiblings: true }],
    },
  },
);
