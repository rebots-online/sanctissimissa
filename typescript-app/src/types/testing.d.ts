import { ReactElement } from 'react';
import { RenderResult } from '@testing-library/react-native';

// Testing Library Types
declare module '@testing-library/react-native' {
  export interface RenderOptions {
    wrapper?: React.ComponentType<any>;
    createNodeMock?: (element: ReactElement) => any;
  }

  export interface RenderAPI extends RenderResult {
    rerender: (ui: ReactElement) => void;
    unmount: () => void;
    asFragment: () => DocumentFragment;
  }

  export function render(
    ui: ReactElement,
    options?: RenderOptions
  ): RenderAPI & {
    container: Element;
    baseElement: Element;
    debug: (baseElement?: Element | DocumentFragment) => void;
    rerender: (ui: ReactElement) => void;
    unmount: () => void;
  };

  export const fireEvent: {
    press: (element: Element | null) => void;
    changeText: (element: Element | null, text: string) => void;
    scroll: (element: Element | null, eventData: { nativeEvent: any }) => void;
    focus: (element: Element | null) => void;
    blur: (element: Element | null) => void;
    [eventName: string]: (element: Element | null, eventData?: any) => void;
  };

  export const act: (callback: () => void | Promise<void>) => Promise<void>;
  export const cleanup: () => void;
  export const waitFor: <T>(callback: () => T | Promise<T>, options?: {
    timeout?: number;
    interval?: number;
  }) => Promise<T>;
}

// Jest Extended Matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      // Custom matchers for React Native testing
      toBeEmpty(): R;
      toHaveTextContent(text: string | RegExp): R;
      toHaveStyle(style: object | object[]): R;
      toBeEnabled(): R;
      toBeDisabled(): R;
      toBeVisible(): R;
      toBeInTheDocument(): R;
      toHaveProp(prop: string, value?: any): R;
      toHaveAnimatedStyle(style: object): R;
      
      // Navigation matchers
      toHaveNavigatedTo(routeName: string, params?: object): R;
      toHaveGoBack(): R;
      
      // Async matchers
      toResolve(): Promise<R>;
      toReject(): Promise<R>;
      toRejectWith(error: Error | string | RegExp): Promise<R>;
    }
  }
}

// React Native Types
declare module 'react-native' {
  export interface PressableStateCallbackType {
    pressed: boolean;
    hovered?: boolean;
    focused?: boolean;
  }

  export interface AnimatedValue {
    setValue(value: number): void;
    setOffset(offset: number): void;
    flattenOffset(): void;
    extractOffset(): void;
    addListener(callback: (state: { value: number }) => void): string;
    removeListener(id: string): void;
    removeAllListeners(): void;
    stopAnimation(callback?: (value: number) => void): void;
  }
}

// Expo Types
declare module 'expo-av' {
  export interface PlaybackStatus {
    isLoaded: boolean;
    isPlaying?: boolean;
    position?: number;
    duration?: number;
    error?: string;
  }
}

// Navigation Types for Testing
declare module '@react-navigation/native' {
  export interface NavigationState {
    index: number;
    routes: Array<{
      key: string;
      name: string;
      params?: object;
    }>;
  }
}