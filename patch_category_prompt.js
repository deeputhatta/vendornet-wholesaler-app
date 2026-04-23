const fs = require('fs');
let c = fs.readFileSync('C:/Users/leksh/wholesaler-app/src/navigation/AppNavigator.js', 'utf8');

// Add useState, useEffect imports if not present
if (!c.includes('useEffect')) {
  c = c.replace(
    `import React from 'react';`,
    `import React, { useState, useEffect } from 'react';`
  );
}

// Add AsyncStorage import
if (!c.includes('AsyncStorage')) {
  c = c.replace(
    `import { CartProvider } from '../context/CartContext';`,
    `import { CartProvider } from '../context/CartContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';`
  );
}

// Replace the root navigator section to check categories
c = c.replace(
  `export default function AppNavigator() {
  const { user, loading } = useAuth();`,
  `export default function AppNavigator() {
  const { user, loading } = useAuth();
  const [categoryChecked, setCategoryChecked] = useState(false);
  const [hasCategories, setHasCategories] = useState(true);

  useEffect(() => {
    if (user) {
      checkCategories();
    } else {
      setCategoryChecked(false);
      setHasCategories(true);
    }
  }, [user]);

  const checkCategories = async () => {
    try {
      const res = await api.get('/categories/my');
      const cats = res.data.categories || [];
      setHasCategories(cats.length > 0);
    } catch (err) {
      setHasCategories(true); // On error, don't block
    } finally {
      setCategoryChecked(true);
    }
  };`
);

// Update the navigation logic
c = c.replace(
  `        {user ? (
          <Stack.Screen name="MainStack" component={MainStack} />
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}`,
  `        {user ? (
          !categoryChecked
            ? null
            : !hasCategories
            ? <Stack.Screen name="CategorySetup" component={CategoryPickerScreen} initialParams={{ isOnboarding: true }} />
            : <Stack.Screen name="MainStack" component={MainStack} />
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}`
);

fs.writeFileSync('C:/Users/leksh/wholesaler-app/src/navigation/AppNavigator.js', c);
console.log('Done');
console.log('categoryChecked:', c.includes('categoryChecked'));
console.log('CategorySetup:', c.includes('CategorySetup'));
