const fs = require('fs');
let c = fs.readFileSync('./src/screens/ProfileScreen.js', 'utf8');

const oldCode = `        {/* App version */}
        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <Text style={styles.rowIcon}>\uD83D\uDCF1</Text>
            <Text style={[styles.rowLabel, { color: c.text }]}>Version</Text>
          </View>
          <Text style={[styles.rowValue, { color: c.textMuted }]}>1.0.0</Text>
        </View>
      </View>`;

const newCode = `        {/* My Categories */}
        <TouchableOpacity
          style={[styles.row, { borderBottomColor: c.borderLight }]}
          onPress={() => navigation.navigate('CategoryPicker')}>
          <View style={styles.rowLeft}>
            <Text style={styles.rowIcon}>\uD83C\uDFF7</Text>
            <Text style={[styles.rowLabel, { color: c.text }]}>My Categories</Text>
          </View>
          <Text style={[styles.rowValue, { color: c.textMuted }]}>\u2192</Text>
        </TouchableOpacity>

        {/* App version */}
        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <Text style={styles.rowIcon}>\uD83D\uDCF1</Text>
            <Text style={[styles.rowLabel, { color: c.text }]}>Version</Text>
          </View>
          <Text style={[styles.rowValue, { color: c.textMuted }]}>1.0.0</Text>
        </View>
      </View>`;

if (c.includes('App version')) {
  c = c.replace(oldCode, newCode);
  fs.writeFileSync('./src/screens/ProfileScreen.js', c);
  console.log('Done — Categories added to ProfileScreen');
} else {
  console.log('Pattern not found');
  console.log(c.substring(c.indexOf('App version') - 50, c.indexOf('App version') + 200));
}
