import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
const THEME_KEY = '@vendornet_theme';

export const lightTheme = {
  dark: false,
  colors: {
    // Backgrounds
    background: '#F2F4F7',
    surface: '#FFFFFF',
    surfaceSecondary: '#F8F9FB',
    card: '#FFFFFF',
    // Brand
    primary: '#185FA5',
    primaryLight: '#E8F0FB',
    accent: '#F2C94C',
    success: '#1D9E75',
    successLight: '#E6F7F2',
    // Text
    text: '#1A1A2E',
    textSecondary: '#4A4A6A',
    textMuted: '#8A8A9A',
    textOnPrimary: '#FFFFFF',
    // UI
    border: '#E2E6EF',
    borderLight: '#EEF0F5',
    inputBackground: '#FFFFFF',
    placeholder: '#BBBBCC',
    // Status colors - light mode friendly
    statusPendingBg: '#FFF8E7',
    statusPendingText: '#B7750D',
    statusSuccessBg: '#E8F7F0',
    statusSuccessText: '#1D9E75',
    statusDangerBg: '#FEEAEA',
    statusDangerText: '#D32F2F',
    statusInfoBg: '#E8F0FB',
    statusInfoText: '#185FA5',
    statusPurpleBg: '#F3E8FF',
    statusPurpleText: '#7B2FBE',
    // Tab bar
    tabBar: '#FFFFFF',
    tabBarActive: '#185FA5',
    tabBarInactive: '#9E9EA8',
    // Shadow
    shadow: '#C8CDD8',
  },
};

export const darkTheme = {
  dark: true,
  colors: {
    // Backgrounds
    background: '#0A0A0F',
    surface: '#16161E',
    surfaceSecondary: '#1E1E2A',
    card: '#16161E',
    // Brand
    primary: '#4A90D9',
    primaryLight: '#0A2540',
    accent: '#F2C94C',
    success: '#1D9E75',
    successLight: '#0A2E22',
    // Text
    text: '#F0F0F8',
    textSecondary: '#A0A0B8',
    textMuted: '#606078',
    textOnPrimary: '#FFFFFF',
    // UI
    border: '#2A2A3A',
    borderLight: '#1E1E2A',
    inputBackground: '#1E1E2A',
    placeholder: '#505068',
    // Status colors - dark mode
    statusPendingBg: '#2A1F00',
    statusPendingText: '#F2C94C',
    statusSuccessBg: '#003A10',
    statusSuccessText: '#30D158',
    statusDangerBg: '#2A0A0A',
    statusDangerText: '#FF453A',
    statusInfoBg: '#001830',
    statusInfoText: '#0A84FF',
    statusPurpleBg: '#1A0A2E',
    statusPurpleText: '#BF5AF2',
    // Tab bar
    tabBar: '#16161E',
    tabBarActive: '#4A90D9',
    tabBarInactive: '#505068',
    // Shadow
    shadow: '#000000',
  },
};

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(true);
  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then(value => {
      if (value !== null) setIsDark(value === 'dark');
      else setIsDark(true);
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
