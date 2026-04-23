module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?react-native|@react-native|react-native-chart-kit|react-native-svg|expo(nent)?|@expo(nent)?/.*|expo-router|react-navigation|@react-navigation/.*)',
  ],
};

