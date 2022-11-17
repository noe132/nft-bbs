const { join } = require('path');

// eslint-disable-next-line
/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: join(__dirname),
};
