import '@testing-library/jest-native/extend-expect';
import { setupTestEnv } from './test-utils/testing';

// Configure testing environment
setupTestEnv();

// Define types for React Native environment
interface Global {
  requestAnimationFrame: (callback: () => void) => number;
  cancelAnimationFrame: (handle: number) => void;
  console: typeof console;
}

declare const global: Global;

// Extend Jest matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeEmpty(): R;
      toHaveTextContent(text: string): R;
      toHaveStyle(style: object): R;
    }
  }

  var describe: (name: string, fn: () => void) => void;
  var beforeEach: (fn: () => void) => void;
  var afterEach: (fn: () => void) => void;
  var beforeAll: (fn: () => void) => void;
  var afterAll: (fn: () => void) => void;
  var it: (name: string, fn: () => void | Promise<void>, timeout?: number) => void;
  var test: (name: string, fn: () => void | Promise<void>, timeout?: number) => void;
}

// Set up console mocks
(global as any).console = {
  ...console,
  // Ignore specific console messages during tests
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
};

// Mock animation frames for React Native environment
(global as any).requestAnimationFrame = (callback: () => void): number => {
  return setTimeout(callback, 0);
};

(global as any).cancelAnimationFrame = (handle: number): void => {
  clearTimeout(handle);
};

// Reset mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
});

// Clean up after each test
afterEach(() => {
  jest.resetAllMocks();
});