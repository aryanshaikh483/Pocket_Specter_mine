module.exports = {
  env: {
    es2021: true,
    node: true,
  },
  parser: '@typescript-eslint/parser',
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended', // Integrates Prettier
  ],
  plugins: ['@typescript-eslint'],
  rules: {
    'no-unused-vars': 'off', // handled by TS
    '@typescript-eslint/no-unused-vars': ['warn'],
  },
};
