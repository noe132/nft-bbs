module.exports = {
  'settings': {
    'import/resolver': {
      'typescript': {
        'directory': __dirname,
      },
    },
  },

  'overrides': [{
    files: [
      '*.ts',
      '*.tsx',
    ],
    parserOptions: {
      tsconfigRootDir: __dirname,
    },
  }],
};
