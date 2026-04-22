const fs = require('fs');
let c = fs.readFileSync('C:/Users/leksh/wholesaler-app/src/screens/ProfileScreen.js', 'utf8');

// Remove theme toggle row
const themeStart = c.indexOf('{/* Theme toggle */}');
const themeEnd = c.indexOf('</View>', c.indexOf('toggleTheme', themeStart)) + '</View>'.length;

if (themeStart > -1) {
  c = c.substring(0, themeStart) + c.substring(themeEnd);
  console.log('Theme toggle removed');
} else {
  console.log('Theme toggle not found');
}

// Remove isDark and toggleTheme from useTheme destructuring
c = c.replace(
  `const { theme, isDark, toggleTheme } = useTheme();`,
  `const { theme } = useTheme();`
);

fs.writeFileSync('C:/Users/leksh/wholesaler-app/src/screens/ProfileScreen.js', c);
console.log('Done');
console.log('toggleTheme remaining:', c.includes('toggleTheme'));
