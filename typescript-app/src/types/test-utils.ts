import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types';

export const createMockNavigation = () => ({
  navigate: jest.fn(),
  goBack: jest.fn(),
  dispatch: jest.fn(),
  reset: jest.fn(),
  isFocused: jest.fn().mockReturnValue(true),
  canGoBack: jest.fn().mockReturnValue(true),
  getParent: jest.fn(),
  getState: jest.fn(),
  getId: jest.fn(),
  addListener: jest.fn(),
  removeListener: jest.fn(),
  replace: jest.fn(),
  push: jest.fn(),
  pop: jest.fn(),
  popToTop: jest.fn(),
  setParams: jest.fn(),
}) as unknown as NativeStackNavigationProp<RootStackParamList, 'Journal'>;

export const createMockRoute = () => ({
  key: 'mock-key',
  name: 'Journal' as const,
  params: {},
}) as RouteProp<RootStackParamList, 'Journal'>;

export type MockNavigation = ReturnType<typeof createMockNavigation>;
export type MockRoute = ReturnType<typeof createMockRoute>;