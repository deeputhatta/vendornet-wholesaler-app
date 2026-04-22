const fs = require('fs');

// Fix in retailer app
let c = fs.readFileSync('./src/screens/CategoryPickerScreen.js', 'utf8');

// Add SafeAreaView import
c = c.replace(
  `import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert
} from 'react-native';`,
  `import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, Platform
} from 'react-native';`
);

// Fix footer style to add bottom padding
c = c.replace(
  `  footer: {
    padding: 16, flexDirection: 'row', gap: 10,
    borderTopWidth: 1,
  },`,
  `  footer: {
    padding: 16,
    paddingBottom: Platform.OS === 'android' ? 24 : 32,
    flexDirection: 'row', gap: 10,
    borderTopWidth: 1,
  },`
);

fs.writeFileSync('./src/screens/CategoryPickerScreen.js', c);
console.log('Fixed retailer app CategoryPickerScreen');
