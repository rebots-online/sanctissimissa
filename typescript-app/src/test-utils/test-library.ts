import { ReactElement } from 'react';
import { StyleProp } from 'react-native';

// Enhanced Test Library Types
export interface RenderAPI {
  container: HTMLElement;
  getByTestId: (testId: string) => HTMLElement;
  getByText: (text: string) => HTMLElement;
  getByPlaceholderText: (placeholder: string) => HTMLElement;
  queryByTestId: (testId: string) => HTMLElement | null;
  getAllByTestId: (testId: string) => HTMLElement[];
  rerender: (ui: ReactElement) => void;
  unmount: () => void;
}

// Custom Matchers
interface AccessibilityMatchers<R> {
  toHaveAccessibilityLabel(label: string): R;
  toHaveAccessibilityValue(value: { now?: number; min?: number; max?: number }): R;
  toHaveStyle(style: StyleProp<any>): R;
  toBeEnabled(): R;
  toBeDisabled(): R;
}

// Enhanced Mock Types
export interface MockResult<T = any> {
  type: 'return' | 'throw';
  value: T;
}

export interface MockMetadata {
  calls: any[][];
  instances: any[];
  results: MockResult[];
  lastCall: any[];
}

export interface MockImplementation {
  mockClear(): void;
  mockReset(): void;
  mockRestore(): void;
  mockImplementation(fn: (...args: any[]) => any): MockFunction;
  mockReturnValue(value: any): MockFunction;
  mockReturnValueOnce(value: any): MockFunction;
  mockResolvedValue(value: any): MockFunction;
  mockRejectedValue(value: any): MockFunction;
  mockResolvedValueOnce(value: any): MockFunction;
  mockRejectedValueOnce(value: any): MockFunction;
}

export interface MockFunction extends Function, MockImplementation {
  (...args: any[]): any;
  getMockImplementation(): Function;
  mock: MockMetadata;
}

// Test utilities
export const wait = (ms: number = 0): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

// Re-export testing utilities
export * from './navigation';

// Re-export custom matchers
declare global {
  namespace jest {
    interface Expect extends CustomMatchers {}
    interface Matchers<R> extends CustomMatchers<R>, AccessibilityMatchers<R> {
      not: Matchers<R>;
    }
  }
}

export interface CustomMatchers<R = unknown> {
  toHaveBeenCalledTimes(n: number): R;
  toBe(value: any): R;
  toBeTruthy(): R;
  toBeNull(): R;
  toHaveBeenCalled(): R;
  toHaveBeenCalledWith(...args: any[]): R;
  toHaveTextContent(text: string): R;
}

// Mock testing library functions
export const render = (component: ReactElement): RenderAPI => {
  // This is just a type placeholder - the actual implementation comes from @testing-library/react-native
  throw new Error('Mock not implemented');
};

export const fireEvent = {
  press: (element: HTMLElement): void => {
    // Mock implementation
  },
  changeText: (element: HTMLElement, text: string): void => {
    // Mock implementation
  },
};

export const act = async (callback: () => Promise<void>): Promise<void> => {
  await callback();
};