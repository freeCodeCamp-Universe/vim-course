export default {
  extends: ['stylelint-config-standard', 'stylelint-config-css-modules'],
  ignoreFiles: ['node_modules/**', 'dist/**', 'coverage/**'],
  rules: {
    'selector-class-pattern': '^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$',
  },
};
