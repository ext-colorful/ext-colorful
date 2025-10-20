module.exports = {
  root: true,
  env: {
    es2021: true,
    browser: true,
    webextensions: true,
    node: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'prettier'],
  ignorePatterns: ['dist/**', 'node_modules/**', 'public/**', 'assets/**'],
  rules: {
    // add project-specific ESLint rules here if needed
  },
};
