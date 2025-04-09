import { useTheme as useNavTheme } from '@react-navigation/native';
import { useColorScheme } from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { lightTheme, darkTheme, Theme } from '../theme';

export const useAppTheme = (): Theme => {
  const colorScheme = useColorScheme();
  const themePreference = useSelector((state: RootState) => state.settings.theme);
  
  const activeTheme = 
    themePreference === 'system' 
      ? colorScheme === 'dark' ? darkTheme : lightTheme
      : themePreference === 'dark' ? darkTheme : lightTheme;

  return activeTheme;
};