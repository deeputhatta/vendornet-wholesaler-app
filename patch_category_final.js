const fs = require('fs');
let c = fs.readFileSync('./src/navigation/AppNavigator.js', 'utf8');

// 1. Remove ALL categoryChecked state and useEffect (could be misplaced)
c = c.replace(
  /\s*const \[categoryChecked, setCategoryChecked\] = useState\(false\);\s*const \[hasCategories, setHasCategories\] = useState\(true\);\s*useEffect\(\(\) => \{[\s\S]*?\}, \[user\]\);/,
  ''
);

// 2. Find AppNavigator function and insert AFTER its useAuth line
const appNavIdx = c.indexOf('export default function AppNavigator()');
const useAuthLine = 'const { user, loading } = useAuth();';
const useAuthIdx = c.indexOf(useAuthLine, appNavIdx);

if (useAuthIdx > -1) {
  const insertAt = useAuthIdx + useAuthLine.length;
  const stateCode = `
  const [categoryChecked, setCategoryChecked] = useState(false);
  const [hasCategories, setHasCategories] = useState(true);
  useEffect(() => {
    if (user) {
      api.get('/categories/my')
        .then(res => { setHasCategories((res.data.categories||[]).length > 0); })
        .catch(() => setHasCategories(true))
        .finally(() => setCategoryChecked(true));
    } else {
      setCategoryChecked(false);
      setHasCategories(true);
    }
  }, [user]);`;
  c = c.substring(0, insertAt) + stateCode + c.substring(insertAt);
  console.log('Inserted after AppNavigator useAuth');
} else {
  console.log('useAuth not found in AppNavigator');
}

fs.writeFileSync('./src/navigation/AppNavigator.js', c);

// Verify
const idx = c.indexOf('categoryChecked');
const context = c.substring(idx - 300, idx);
console.log('In AppNavigator:', context.includes('export default function AppNavigator'));
console.log('CategorySetup:', c.includes('CategorySetup'));
