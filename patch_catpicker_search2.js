const fs = require('fs');

function fix(path) {
  let c = fs.readFileSync(path, 'utf8');

  // Remove duplicate style entries
  c = c.replace(
    `  searchBar: { paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1 },
  searchInput: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14 },
  searchBar: { paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1 },
  searchInput: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14 },`,
    `  searchBar: { paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1 },
  searchInput: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14 },`
  );

  // Insert search bar before ScrollView using index
  const scrollViewMarker = '<ScrollView style={styles.scroll} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>';
  const scrollIdx = c.indexOf(scrollViewMarker);
  
  if (scrollIdx > -1 && !c.includes('Search categories')) {
    const searchBar = `{/* Search bar */}
      <View style={[styles.searchBar, { backgroundColor: c.surface, borderBottomColor: c.border }]}>
        <TextInput
          style={[styles.searchInput, { color: c.text, backgroundColor: c.surfaceSecondary }]}
          placeholder="Search categories..."
          placeholderTextColor={c.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
      `;
    c = c.substring(0, scrollIdx) + searchBar + c.substring(scrollIdx);
    console.log('Search bar inserted');
  }

  // Fix categories.map to filter by search
  c = c.replace(
    `{categories.map(cat => {`,
    `{categories.filter(cat => cat.name.toLowerCase().includes((searchQuery||'').toLowerCase())).map(cat => {`
  );

  fs.writeFileSync(path, c);
  console.log('Done');
  console.log('Search categories:', c.includes('Search categories'));
  console.log('filter by search:', c.includes('searchQuery'));
}

fix('./src/screens/CategoryPickerScreen.js');
