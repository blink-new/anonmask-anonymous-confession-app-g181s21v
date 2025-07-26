module.exports = {
  extends: ['expo', '@react-native'],
  rules: {
    // Disable some rules that might be too strict for our use case
    '@typescript-eslint/no-unused-vars': 'warn',
    'react-hooks/exhaustive-deps': 'warn',
  },
};