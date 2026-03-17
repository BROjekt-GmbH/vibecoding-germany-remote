import type { Config } from 'jest';

const config: Config = {
  projects: [
    // Backend / server-side tests (Node environment)
    {
      displayName: 'backend',
      preset: 'ts-jest',
      testEnvironment: 'node',
      moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
      transform: {
        '^.+\\.tsx?$': ['ts-jest', { tsconfig: { moduleResolution: 'node' } }],
      },
      testMatch: ['**/__tests__/**/*.test.ts'],
    },
    // Frontend component tests (jsdom environment)
    {
      displayName: 'frontend',
      preset: 'ts-jest',
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
      moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
      transform: {
        '^.+\\.tsx?$': ['ts-jest', { tsconfig: { jsx: 'react-jsx', moduleResolution: 'node' } }],
      },
      testMatch: ['**/__tests__/**/*.test.tsx'],
    },
  ],
};

export default config;
