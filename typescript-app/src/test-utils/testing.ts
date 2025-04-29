/**
 * Test Utilities
 * Shared utilities and helper functions for testing
 */

// Extend NodeJS.Global interface to include our test properties
declare global {
  namespace NodeJS {
    interface Global {
      requestAnimationFrame: (callback: () => void) => number;
      cancelAnimationFrame: (handle: number) => void;
      console: Console;
      alert: (message?: string) => void;
      fetch: typeof fetch;
    }
  }
}

/**
 * Wait for a specified number of milliseconds
 */
export const wait = (ms: number = 0): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Type-safe Promise resolver for test async operations
 */
export const resolvePromise = <T>(value: T): Promise<T> => {
  return new Promise<T>((resolve) => {
    setTimeout(() => resolve(value), 0);
  });
};

/**
 * Type-safe Promise rejector for test async operations
 */
export const rejectPromise = (error: Error): Promise<never> => {
  return new Promise((_, reject) => {
    setTimeout(() => reject(error), 0);
  });
};

/**
 * Mock implementation of requestAnimationFrame for testing
 */
export const mockRequestAnimationFrame = (callback: () => void): number => {
  setTimeout(callback, 0);
  return 0;
};

/**
 * Mock implementation of cancelAnimationFrame for testing
 */
export const mockCancelAnimationFrame = (handle: number): void => {
  // No-op in tests
};

/**
 * Setup global test environment
 */
export const setupTestEnv = (): void => {
  (global as any).requestAnimationFrame = mockRequestAnimationFrame;
  (global as any).cancelAnimationFrame = mockCancelAnimationFrame;

  // Mock console methods
  const mockConsole = {
    ...console,
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  };

  (global as any).console = mockConsole;

  // Mock fetch
  (global as any).fetch = jest.fn();

  // Mock alert
  (global as any).alert = jest.fn();
};

/**
 * Type-safe function to skip ESLint warnings for specific lines in tests
 */
export const suppressTestWarnings = (code: string): void => {
  // eslint-disable-next-line no-console
  console.warn = jest.fn();
  eval(code); // Used only in tests
};