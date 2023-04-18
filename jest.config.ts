export default {
  testEnvironment: 'node',
  testTimeout: 45_000,
  transform: {
    '^.+\\.(t|mj)sx?$': [
      'ts-jest',
      {
        isolatedModules: true,
        allowJs: true,
      },
    ],
  },
};
