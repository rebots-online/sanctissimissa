export const lightTheme = {
  colors: {
    primary: '#862633', // Traditional liturgical red
    secondary: '#8B7355', // Warm brown
    background: '#FFFFFF',
    surface: '#F5F5F5',
    text: '#1A1A1A',
    textSecondary: '#4A4A4A',
    border: '#E0E0E0',
    error: '#B00020',
    success: '#4CAF50',
    warning: '#FFC107',
  },
  typography: {
    fontFamily: {
      regular: 'System',
      medium: 'System',
      bold: 'System',
    },
    fontSize: {
      small: 12,
      body: 16,
      subtitle: 18,
      title: 20,
      heading: 24,
      display: 34,
    },
    lineHeight: {
      small: 16,
      body: 24,
      subtitle: 28,
      title: 32,
      heading: 36,
      display: 48,
    },
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    small: 4,
    medium: 8,
    large: 16,
  },
};

export const darkTheme = {
  ...lightTheme,
  colors: {
    ...lightTheme.colors,
    primary: '#FF8A80', // Lighter red for dark theme
    secondary: '#D7CCC8', // Lighter brown
    background: '#121212',
    surface: '#1E1E1E',
    text: '#FFFFFF',
    textSecondary: '#B0B0B0',
    border: '#2C2C2C',
    error: '#CF6679',
    success: '#81C784',
    warning: '#FFD54F',
  },
};

export type Theme = typeof lightTheme;
export type ThemeColors = typeof lightTheme.colors;