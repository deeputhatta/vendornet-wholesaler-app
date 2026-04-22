const fs = require('fs');

function addLimit(path, maxCount) {
  let c = fs.readFileSync(path, 'utf8');

  // Add max limit constant after imports
  if (!c.includes('MAX_CATEGORIES')) {
    c = c.replace(
      `const DEFAULT_CONFIG = { icon: '📦', color: '#f8fafc', textColor: '#475569' };`,
      `const DEFAULT_CONFIG = { icon: '📦', color: '#f8fafc', textColor: '#475569' };
const MAX_CATEGORIES = ${maxCount};`
    );

    // Update toggleCategory to enforce limit
    c = c.replace(
      `  const toggleCategory = (catId) => {
    setSelected(prev =>
      prev.includes(catId) ? prev.filter(id => id !== catId) : [...prev, catId]
    );
  };`,
      `  const toggleCategory = (catId) => {
    setSelected(prev => {
      if (prev.includes(catId)) return prev.filter(id => id !== catId);
      if (prev.length >= MAX_CATEGORIES) {
        Alert.alert('Limit Reached', \`You can select up to \${MAX_CATEGORIES} categories only.\`);
        return prev;
      }
      return [...prev, catId];
    });
  };`
    );

    // Update subtitle to show limit
    c = c.replace(
      `<Text style={styles.subtitle}>Select categories you {roleLabel} in</Text>`,
      `<Text style={styles.subtitle}>Select up to {MAX_CATEGORIES} categories you {roleLabel} in</Text>`
    );

    // Update footer count to show limit
    c = c.replace(
      `<Text style={[styles.footerCount, { color: c.text }]}>{selected.length}/{categories.length}</Text>`,
      `<Text style={[styles.footerCount, { color: c.text }]}>{selected.length}/{MAX_CATEGORIES}</Text>`
    );

    fs.writeFileSync(path, c);
    console.log(`Fixed ${path} — max ${maxCount} categories`);
  } else {
    console.log('Already patched:', path);
  }
}

// Retailer app — max 3
addLimit('./src/screens/CategoryPickerScreen.js', 5);
