export default {
  testEnvironment: 'node',
  transform: {},
  testMatch: ['**/server/__tests__/**/*.test.js'],
  verbose: true,
  collectCoverageFrom: [
    'server/**/*.js',
    '!server/__tests__/**',
  ],
};
