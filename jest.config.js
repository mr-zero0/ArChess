module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src/server'],
  testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],
  collectCoverageFrom: [
    'src/server/**/*.js',
    '!src/server/index.js',
    '!src/server/**/__tests__/**'
  ],
  coverageDirectory: 'coverage',
  verbose: true
};