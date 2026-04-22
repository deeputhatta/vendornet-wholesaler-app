const fs = require('fs');
let c = fs.readFileSync('./src/screens/OrdersScreen.js', 'utf8');

// Find and replace the broken header section
const brokenHeader = `<View style={[styles.header, { backgroundColor: c.primary }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View>
            <Text style={styles.title}>Orders</Text>
          <Text style={styles.headerSub}>
            {allOrders.length} total{pendingCount > 0 ? \` · \${pendingCount} need action\` : ''}
          </Text>
          </View>
          <TouchableOpacity
            style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', marginTop: 4 }}
            onPress={() => navigation.getParent()?.navigate('ReportDownload')}>
            <Text style={{ fontSize: 14 }}>\uD83D\uDCE5</Text>
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>Report</Text>
          </TouchableOpacity>`;

const fixedHeader = `<View style={[styles.header, { backgroundColor: c.primary }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={styles.title}>Orders</Text>
            <Text style={styles.headerSub}>
              {allOrders.length} total{pendingCount > 0 ? \` · \${pendingCount} need action\` : ''}
            </Text>
          </View>
          <TouchableOpacity
            style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' }}
            onPress={() => navigation.getParent()?.navigate('ReportDownload')}>
            <Text style={{ fontSize: 14 }}>\uD83D\uDCE5</Text>
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>Report</Text>
          </TouchableOpacity>`;

if (c.includes(brokenHeader)) {
  c = c.replace(brokenHeader, fixedHeader);
  fs.writeFileSync('./src/screens/OrdersScreen.js', c);
  console.log('Fixed');
} else {
  // Try simpler approach - just fix the indentation issue
  c = c.replace(
    `<View>
            <Text style={styles.title}>Orders</Text>
          <Text style={styles.headerSub}>
            {allOrders.length} total{pendingCount > 0 ? \` · \${pendingCount} need action\` : ''}
          </Text>
          </View>`,
    `<View>
            <Text style={styles.title}>Orders</Text>
            <Text style={styles.headerSub}>
              {allOrders.length} total{pendingCount > 0 ? \` · \${pendingCount} need action\` : ''}
            </Text>
          </View>`
  );
  fs.writeFileSync('./src/screens/OrdersScreen.js', c);
  console.log('Fixed indentation');
}

// Verify
const i = c.indexOf('styles.header');
console.log(c.substring(i, i+500));
