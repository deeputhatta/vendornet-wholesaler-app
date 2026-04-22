const fs = require('fs');

function fix(path) {
  let c = fs.readFileSync(path, 'utf8');

  // Add useSafeAreaInsets import
  if (!c.includes('useSafeAreaInsets')) {
    c = c.replace(
      `import { useTheme } from '../context/ThemeContext';`,
      `import { useTheme } from '../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';`
    );

    // Add insets to component
    c = c.replace(
      `  const { theme } = useTheme();
  const c = theme.colors;`,
      `  const { theme } = useTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();`
    );

    // Apply insets to footer
    c = c.replace(
      `  footer: {
    padding: 16,
    paddingBottom: Platform.OS === 'android' ? 24 : 32,
    flexDirection: 'row', gap: 10,
    borderTopWidth: 1,
  },`,
      `  footer: {
    padding: 16,
    flexDirection: 'row', gap: 10,
    borderTopWidth: 1,
  },`
    );

    // Apply dynamic paddingBottom in JSX
    c = c.replace(
      `<View style={[styles.footer, { backgroundColor: c.surface, borderTopColor: c.border }]}>`,
      `<View style={[styles.footer, { backgroundColor: c.surface, borderTopColor: c.border, paddingBottom: Math.max(insets.bottom + 8, 16) }]}>`
    );
  }

  fs.writeFileSync(path, c);
  console.log('Fixed:', path);
}

fix('./src/screens/CategoryPickerScreen.js');
