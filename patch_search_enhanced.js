const fs = require('fs');

['C:/Users/leksh/retailer-app2/src/screens/CategoryPickerScreen.js',
 'C:/Users/leksh/wholesaler-app/src/screens/CategoryPickerScreen.js'].forEach(path => {
  let c = fs.readFileSync(path, 'utf8');

  // Replace search bar JSX with enhanced version
  c = c.replace(
    `{/* Search bar */}
      <View style={[styles.searchBar, { backgroundColor: c.surface, borderBottomColor: c.border }]}>
        <TextInput
          style={[styles.searchInput, { color: c.text, backgroundColor: c.surfaceSecondary }]}
          placeholder="Search categories..."
          placeholderTextColor={c.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>`,
    `{/* Search bar */}
      <View style={[styles.searchBar, { backgroundColor: c.surface, borderBottomColor: c.border }]}>
        <View style={[styles.searchBox, { backgroundColor: c.surfaceSecondary, borderColor: c.border }]}>
          <Text style={{ fontSize: 16, marginRight: 8 }}>\uD83D\uDD0D</Text>
          <TextInput
            style={[styles.searchInput, { color: c.text, flex: 1 }]}
            placeholder="Search categories..."
            placeholderTextColor={c.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={{ fontSize: 14, color: c.textMuted, paddingHorizontal: 4 }}>\u2715</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>`
  );

  // Update search styles
  c = c.replace(
    `  searchBar: { paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1 },
  searchInput: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14 },`,
    `  searchBar: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1 },
  searchBox: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1 },
  searchInput: { fontSize: 14, paddingVertical: 0 },`
  );

  fs.writeFileSync(path, c);
  console.log('Fixed:', path);
  console.log('searchBox:', c.includes('searchBox'));
});
