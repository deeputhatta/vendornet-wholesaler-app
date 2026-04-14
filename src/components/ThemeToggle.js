import React from 'react';
import { View, Switch, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle() {
  const { isDark, toggleTheme, theme } = useTheme();
  const c = theme.colors;

  return (
    <View style={styles.row}>
      <Text style={[styles.label, { color: c.textSecondary }]}>
        {isDark ? '🌙 Dark' : '☀️ Light'}
      </Text>
      <Switch
        value={isDark}
        onValueChange={toggleTheme}
        trackColor={{ false: c.border, true: c.primary }}
        thumbColor={isDark ? c.accent : '#FFFFFF'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontSize: 13,
  },
});