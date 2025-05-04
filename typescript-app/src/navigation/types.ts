/**
 * Navigation Types
 *
 * Type definitions for navigation parameters and routes
 */

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';

/**
 * Root Stack Parameter List
 */
export type RootStackParamList = {
  Main: undefined;
  Mass: { date?: string };
  Office: { date?: string; hour?: string };
  Prayer: { category?: string };
  Journal: { id?: string };
  Glossary: undefined;
  Settings: undefined;
  CalendarDemo: undefined;
  DeviceDebug: undefined;
};

/**
 * Bottom Tab Parameter List
 */
export type BottomTabParamList = {
  Home: undefined;
  Mass: undefined;
  Office: undefined;
  Calendar: undefined;
};

/**
 * Root Stack Screen Props
 */
export type RootStackScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

/**
 * Tab Screen Props
 */
export type TabScreenProps<T extends keyof BottomTabParamList> =
  CompositeScreenProps<
    BottomTabScreenProps<BottomTabParamList, T>,
    RootStackScreenProps<keyof RootStackParamList>
  >;

/**
 * Navigation Props Type Guard
 */
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}