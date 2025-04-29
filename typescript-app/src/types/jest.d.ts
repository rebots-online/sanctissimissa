/// <reference types="jest" />
import '@testing-library/jest-native/extend-expect';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';

declare global {
  const expect: jest.Expect;

  namespace jest {
    interface Matchers<R, T = {}> {
      toBeNull(): R;
      toBeTruthy(): R;
      toBeFalsy(): R;
      toHaveBeenCalled(): R;
      toHaveBeenCalledWith(...args: any[]): R;
      toHaveStyle(style: object): R;
      toHaveTextContent(text: string): R;
      toContainElement(element: any): R;
      toBeEnabled(): R;
      toBeDisabled(): R;
      toBeVisible(): R;
      toBeEmpty(): R;
      toContainHTML(html: string): R;
    }

    interface Expect {
      <T = any>(actual: T): Matchers<void, T>;
      extend(matchers: object): void;
      objectContaining<T = any>(expected: Partial<T>): T;
    }

    interface Mock<T = any, Y extends any[] = any> {
      (...args: Y): T;
      mockClear(): void;
      mockReset(): void;
      mockImplementation(fn: (...args: Y) => T): Mock<T, Y>;
      mockReturnValue(value: T): Mock<T, Y>;
      mockResolvedValue(value: T): Mock<T, Y>;
      mockRejectedValue(value: any): Mock<T, Y>;
      mockReturnThis(): Mock<T, Y>;
    }

    type MockNavigationProp = {
      [K in keyof NativeStackNavigationProp<RootStackParamList, 'Journal'>]: Mock;
    };

    function fn<T = any, Y extends any[] = any>(): Mock<T, Y>;
    function mock(moduleName: string, factory?: () => any): typeof jest;
    function clearAllMocks(): void;
    function resetAllMocks(): void;
    function spyOn<T extends {}, M extends keyof T>(
      object: T,
      method: M
    ): Mock<T[M]>;
  }
}

declare module '@testing-library/react-native' {
  export function render(
    component: React.ReactElement
  ): {
    container: any;
    getByText: (text: string) => HTMLElement;
    getByTestId: (id: string) => HTMLElement;
    getByPlaceholderText: (text: string) => HTMLElement;
    queryByText: (text: string) => HTMLElement | null;
    queryByTestId: (id: string) => HTMLElement | null;
    getAllByText: (text: string) => HTMLElement[];
    getAllByTestId: (id: string) => HTMLElement[];
  };
  
  export const fireEvent: {
    press: (element: HTMLElement) => void;
    changeText: (element: HTMLElement, text: string) => void;
  };

  export const act: (callback: () => void | Promise<void>) => Promise<void>;
  export const waitFor: (callback: () => void | Promise<void>) => Promise<void>;
  export const cleanup: () => void;
}

declare module 'expo-av' {
  export const Audio: {
    Recording: {
      createAsync: jest.Mock;
    };
    Sound: {
      createAsync: jest.Mock;
    };
    requestPermissionsAsync: jest.Mock;
    setAudioModeAsync: jest.Mock;
  };
  export interface AVPlaybackStatus {
    isLoaded: boolean;
    isPlaying?: boolean;
  }
}

declare module '@expo/vector-icons' {
  export const MaterialIcons: React.FC<{
    name: string;
    size?: number;
    color?: string;
  }>;
}