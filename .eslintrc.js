module.exports = {
  root: true,
  env: {
    es6: true,
    mocha: true,
    node: true
  },
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'mocha'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier'
  ],
  rules: {
    '@typescript-eslint/no-empty-function': 'off',
    'prefer-arrow-callback': 'error'
  }
}
