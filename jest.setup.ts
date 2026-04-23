import '@testing-library/jest-native/extend-expect';

declare const jest: any;

jest.mock('@react-native-async-storage/async-storage', () => {
  let store = new Map<string, string>();
  const mockFn = require('jest-mock').fn;
  return {
    __INTERNAL_MOCK_STORAGE__: store,
    getItem: mockFn(async (key: string) => store.get(key) ?? null),
    setItem: mockFn(async (key: string, value: string) => {
      store.set(key, value);
    }),
    removeItem: mockFn(async (key: string) => {
      store.delete(key);
    }),
    clear: mockFn(async () => {
      store = new Map<string, string>();
    }),
  };
});
