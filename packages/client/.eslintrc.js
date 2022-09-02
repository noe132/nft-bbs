const path = require('path');

module.exports = {
  'settings': {
    'import/resolver': {
      'typescript': {
        'project': [
          path.join(__dirname, 'tsconfig.json'),
        ],
      },
    },
  },
};
