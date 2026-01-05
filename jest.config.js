export default {
  projects: [
    // Server tests - Node environment
    {
      displayName: 'server',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/server/__tests__/**/*.test.js'],
      transform: {},
      collectCoverageFrom: [
        'server/**/*.js',
        '!server/__tests__/**',
      ],
    },
    // Frontend tests - jsdom environment
    {
      displayName: 'frontend',
      testEnvironment: 'jsdom',
      testMatch: ['<rootDir>/public/__tests__/**/*.test.js'],
      transform: {},
      setupFilesAfterEnv: ['<rootDir>/public/__tests__/setup.js'],
      collectCoverageFrom: [
        'public/**/*.js',
        '!public/__tests__/**',
      ],
    },
  ],
  verbose: true,
};
