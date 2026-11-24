import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['dist/**', 'tmp/**', 'temp/**', 'coverage/**', 'test-results/**', 'playwright-report/**'] },
  {
    files: ['**/*.{js,jsx,mjs}'],
    rules: {
      ...js.configs.recommended.rules,
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', ignoreRestSiblings: true, caughtErrors: 'none' }],
      'no-empty': ['error', { allowEmptyCatch: true }]
    },
    languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } }
  },
  { files: ['src/**/*.{js,jsx}', 'tests/dados/**/*.{js,jsx}'], languageOptions: { globals: globals.browser } },
  { files: ['*.js', '{scripts,prisma,server}/**/*.{mjs,js}'], languageOptions: { globals: globals.node } },
  { files: ['qa/**/*.{js,mjs}', 'tests/{navegadores,integracao,unitarios}/**/*.js'], languageOptions: { globals: { ...globals.node, ...globals.browser } } },
  { files: ['public/sw.js'], languageOptions: { globals: globals.serviceworker } }
];
