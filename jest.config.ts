import type { Config } from 'jest';

const config: Config = {
  testEnvironment: 'node',
  testTimeout: 45_000,
  transform: {
    '^.+\\.(t|mj)sx?$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.jest.json',
        isolatedModules: true,
        allowJs: true,
      },
    ],
  },
};

export default config;
