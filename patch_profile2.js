const fs = require('fs');
let c = fs.readFileSync('./src/screens/ProfileScreen.js', 'utf8');

// Insert before {/* App version */}
const marker = '{/* App version */}';
const insertion = `{/* My Categories */}
        <TouchableOpacity
          style={[styles.row, { borderBottomColor: c.borderLight }]}
          onPress={() => navigation.navigate('CategoryPicker')}>
          <View style={styles.rowLeft}>
            <Text style={styles.rowIcon}>\uD83C\uDFF7</Text>
            <Text style={[styles.rowLabel, { color: c.text }]}>My Categories</Text>
          </View>
          <Text style={[styles.rowValue, { color: c.textMuted }]}>\u2192</Text>
        </TouchableOpacity>

        `;

if (c.includes(marker)) {
  c = c.replace(marker, insertion + marker);
  fs.writeFileSync('./src/screens/ProfileScreen.js', c);
  console.log('Done');
} else {
  console.log('Marker not found');
}
