const fs = require('fs');

function fix(path) {
  let c = fs.readFileSync(path, 'utf8');

  // 1. Add search state
  c = c.replace(
    `  const [saving, setSaving] = useState(false);`,
    `  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');`
  );

  // 2. Add TextInput to imports
  c = c.replace(
    `import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert
} from 'react-native';`,
    `import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, TextInput
} from 'react-native';`
  );

  // 3. Filter categories by search and add Others
  c = c.replace(
    `      setCategories(allRes.data.categories || []);`,
    `      const cats = allRes.data.categories || [];
      // Add Others option
      if (!cats.find(cat => cat.name === 'Others')) {
        cats.push({ category_id: 'others', name: 'Others', slug: 'others' });
      }
      setCategories(cats);`
  );

  // 4. Add search bar before the list
  c = c.replace(
    `      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}>
        {categories.map(cat => {`,
    `      {/* Search bar */}
      <View style={[styles.searchBar, { backgroundColor: c.surface, borderBottomColor: c.border }]}>
        <TextInput
          style={[styles.searchInput, { color: c.text, backgroundColor: c.surfaceSecondary }]}
          placeholder="Search categories..."
          placeholderTextColor={c.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}>
        {categories.filter(cat => cat.name.toLowerCase().includes(searchQuery.toLowerCase())).map(cat => {`
  );

  // 5. Make footer more compact
  c = c.replace(
    `  footer: { padding: 12, paddingHorizontal: 16, borderTopWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },`,
    `  footer: { padding: 10, paddingHorizontal: 14, borderTopWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },`
  );
  c = c.replace(
    `  footerCount: { fontSize: 20, fontWeight: '800' },`,
    `  footerCount: { fontSize: 16, fontWeight: '800' },`
  );
  c = c.replace(
    `  saveBtn: { borderRadius: 10, height: 44, paddingHorizontal: 24, justifyContent: 'center', alignItems: 'center', minWidth: 80 },`,
    `  saveBtn: { borderRadius: 10, height: 40, paddingHorizontal: 20, justifyContent: 'center', alignItems: 'center', minWidth: 80 },`
  );
  c = c.replace(
    `  cancelBtn: { borderRadius: 10, height: 44, paddingHorizontal: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },`,
    `  cancelBtn: { borderRadius: 10, height: 40, paddingHorizontal: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },`
  );

  // 6. Add search styles
  c = c.replace(
    `  scroll: { flex: 1 },`,
    `  searchBar: { paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1 },
  searchInput: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14 },
  scroll: { flex: 1 },`
  );

  fs.writeFileSync(path, c);
  console.log('Fixed:', path);
  console.log('searchQuery:', c.includes('searchQuery'));
  console.log('Others:', c.includes("'Others'"));
}

fix('./src/screens/CategoryPickerScreen.js');
