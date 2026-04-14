import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_KEY = '@vendornet_wholesaler_theme';

export const lightTheme = {
  dark: false,
  colors: {
    background: '#F5F5F5',
    surface: '#FFFFFF',
    surfaceSecondary: '#F0F0F0',
    primary: '#0F6E56',
    primaryLight: '#E1F5EE',
    accent: '#F2C94C',
    success: '#1D9E75',
    successLight: '#E6F7F2',
    text: '#1C1C1E',
    textSecondary: '#6B6B6B',
    textMuted: '#9E9E9E',
    textOnPrimary: '#FFFFFF',
    border: '#E0E0E0',
    borderLight: '#F0F0F0',
    inputBackground: '#F8F8F8',
    placeholder: '#AAAAAA',
    error: '#E53935',
    tabBar: '#FFFFFF',
    tabBarActive: '#0F6E56',
    tabBarInactive: '#9E9E9E',
  },
};

export const darkTheme = {
  dark: true,
  colors: {
    background: '#000000',
    surface: '#1C1C1E',
    surfaceSecondary: '#2C2C2E',
    primary: '#1D9E75',
    primaryLight: '#0A2E22',
    accent: '#F2C94C',
    success: '#1D9E75',
    successLight: '#0A2E22',
    text: '#F2F2F7',
    textSecondary: '#ABABAB',
    textMuted: '#636366',
    textOnPrimary: '#FFFFFF',
    border: '#3A3A3C',
    borderLight: '#2C2C2E',
    inputBackground: '#2C2C2E',
    placeholder: '#636366',
    error: '#FF453A',
    tabBar: '#1C1C1E',
    tabBarActive: '#1D9E75',
    tabBarInactive: '#636366',
  },
};

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then(value => {
      if (value !== null) setIsDark(value === 'dark');
    });
  }, []);

  const toggleTheme = async () => {
    const next = !isDark;
    setIsDark(next);
    await AsyncStorage.setItem(THEME_KEY, next ? 'dark' : 'light');
  };

  const theme = isDark ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used inside ThemeProvider');
  return context;
}