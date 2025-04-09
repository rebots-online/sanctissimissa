import { DarkTheme, DefaultTheme, Theme } from '@react-navigation/native';
import { useColorScheme } from 'react-native';
import { lightTheme, darkTheme } from '../theme';

export const navigationTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: lightTheme.colors.primary,
    background: lightTheme.colors.background,
    card: lightTheme.colors.surface,
    text: lightTheme.colors.text,
    border: lightTheme.colors.border,
    notification: lightTheme.colors.error,
  },
};

export const darkNavigationTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: darkTheme.colors.primary,
    background: darkTheme.colors.background,
    card: darkTheme.colors.surface,
    text: darkTheme.colors.text,
    border: darkTheme.colors.border,
    notification: darkTheme.colors.error,
  },
};

export const useNavigationTheme = () => {
  const colorScheme = useColorScheme();
  return colorScheme === 'dark' ? darkNavigationTheme : navigationTheme;
};