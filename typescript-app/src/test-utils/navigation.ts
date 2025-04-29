import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp, NavigationState } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types';

// Navigation event types
export type NavigationEventType = 'focus' | 'blur' | 'state';
export type NavigationListener = (event: NavigationEvent) => void;

// Navigation event interface
export interface NavigationEvent {
  type: NavigationEventType;
  target: string;
  data?: unknown;
}

// Base navigation state interface
interface BaseNavigationState {
  key: string;
  index: number;
  routeNames: string[];
  routes: Array<{
    key: string;
    name: string;
    params?: object;
  }>;
  type: string;
  stale: true;
}

// Create mock navigation state
const createNavigationState = (): BaseNavigationState => ({
  key: 'root',
  index: 0,
  routeNames: ['Journal'],
  routes: [{ 
    key: 'Journal-key',
    name: 'Journal'
  }],
  type: 'stack',
  stale: true
});

// Create mock navigation object
export const createMockNavigation = (): NativeStackNavigationProp<RootStackParamList, 'Journal'> => {
  const state = createNavigationState();
  const listeners = new Map<NavigationEventType, Set<NavigationListener>>();
  const listenerCalls: Array<[NavigationEventType, NavigationListener]> = [];

  const addListener = (eventName: NavigationEventType, callback: NavigationListener) => {
    if (!listeners.has(eventName)) {
      listeners.set(eventName, new Set());
    }
    listeners.get(eventName)?.add(callback);
    listenerCalls.push([eventName, callback]);
    return () => {
      listeners.get(eventName)?.delete(callback);
    };
  };

  const nav = {
    navigate: jest.fn(),
    goBack: jest.fn(),
    dispatch: jest.fn(),
    reset: jest.fn(),
    isFocused: jest.fn().mockReturnValue(true),
    canGoBack: jest.fn().mockReturnValue(true),
    getParent: jest.fn(),
    getState: jest.fn().mockReturnValue(state),
    getId: jest.fn().mockReturnValue('test-nav'),
    addListener: jest.fn().mockImplementation(addListener),
    removeListener: jest.fn(),
    replace: jest.fn(),
    push: jest.fn(),
    pop: jest.fn(),
    popToTop: jest.fn(),
    setParams: jest.fn(),
    setOptions: jest.fn(),
    __listenerCalls: listenerCalls, // For testing purposes
  };

  return nav as unknown as NativeStackNavigationProp<RootStackParamList, 'Journal'>;
};

// Create mock route object
export const createMockRoute = (): RouteProp<RootStackParamList, 'Journal'> => ({
  key: 'Journal-key',
  name: 'Journal',
  params: {}
});

// Types for mock objects
export type MockNavigation = ReturnType<typeof createMockNavigation>;
export type MockRoute = ReturnType<typeof createMockRoute>;

// Create navigation event
export const createNavigationEvent = (
  type: NavigationEventType,
  data?: unknown
): NavigationEvent => ({
  type,
  target: 'Journal-key',
  data
});

// Type guard for extended navigation object
const isExtendedNavigation = (nav: any): nav is MockNavigation & { __listenerCalls: Array<[NavigationEventType, NavigationListener]> } => {
  return Array.isArray((nav as any).__listenerCalls);
};

// Trigger navigation event
export const triggerNavigationEvent = (
  navigation: MockNavigation,
  event: NavigationEvent
): void => {
  if (!isExtendedNavigation(navigation)) {
    throw new Error('Invalid navigation object');
  }

  const listeners = navigation.__listenerCalls
    .filter(([eventName]) => eventName === event.type)
    .map(([_, callback]) => callback);
    
  listeners.forEach(callback => callback(event));
};