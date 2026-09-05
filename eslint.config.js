// Flat config — ESLint 9 + typescript-eslint (recommended, non-type-checked)
// + react-hooks. The codebase already enforces strict tsc (noUnusedLocals,
// noUnusedParameters), so this layer exists for what tsc cannot see: hook
// dependency bugs, unsafe hook call sites, and TS-adjacent code smells.
// Lints the TypeScript surface (src, tests, vite.config.ts). scripts/*.mjs
// are standalone Node utilities outside that surface (their unused-import
// cleanup is noted future work).
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  {
    ignores: [
      'build/',
      'dist/',
      'dist-web/',
      'VENDORED/',
      'LIBS/',
      'assets/',
      'public/',
      'content/',
      'scripts/',
      'src-tauri/',
      'node_modules/',
      'coverage/',
    ],
  },
  ...tseslint.configs.recommended,
  {
    rules: {
      // Match tsc's noUnusedParameters convention: a leading `_` marks a
      // deliberately-unused positional (interface conformance, stub callbacks).
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  {
    files: ['tests/**/*.ts'],
    rules: {
      // Contract tests deliberately feed invalid types (`undefined as any`)
      // to assert runtime robustness — the cast is the point.
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
);
