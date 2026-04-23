const fs = require('fs');
let c = fs.readFileSync('./src/navigation/AppNavigator.js', 'utf8');

// Check if CategoryPickerScreen is imported
if (!c.includes('CategoryPickerScreen')) {
  c = c.replace(
    `import api from '../services/api';`,
    `import api from '../services/api';
import CategoryPickerScreen from '../screens/CategoryPickerScreen';`
  );
}

// Replace navigation block using regex to handle CRLF
c = c.replace(
  /\{user \? \(\s*<Stack\.Screen name="MainStack" component=\{MainStack\} \/>\s*\) : \(\s*<Stack\.Screen name="Login" component=\{LoginScreen\} \/>\s*\)\}/,
  `{user ? (
          !categoryChecked ? <Stack.Screen name="Loading">{() => null}</Stack.Screen> :
          !hasCategories
            ? <Stack.Screen name="CategorySetup" component={CategoryPickerScreen} initialParams={{ isOnboarding: true }} />
            : <Stack.Screen name="MainStack" component={MainStack} />
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}`
);

fs.writeFileSync('./src/navigation/AppNavigator.js', c);
console.log('CategorySetup:', c.includes('CategorySetup'));
console.log('CategoryPickerScreen:', c.includes('CategoryPickerScreen'));
