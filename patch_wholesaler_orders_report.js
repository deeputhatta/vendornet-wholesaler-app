const fs = require('fs');
let c = fs.readFileSync('./src/screens/OrdersScreen.js', 'utf8');

// Find header section and add report button
const oldHeader = `<View style={[styles.header, { backgroundColor: c.primary }]}>
        <View>
          <Text style={styles.title}>Orders</Text>`;

const newHeader = `<View style={[styles.header, { backgroundColor: c.primary }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View>
            <Text style={styles.title}>Orders</Text>`;

c = c.replace(oldHeader, newHeader);

// Find end of headerSub and close the inner View, add button
const headerSubEnd = c.indexOf('</Text>', c.indexOf('need action')) + 7;
const afterHeaderSub = c.substring(headerSubEnd, headerSubEnd + 50);
console.log('After headerSub:', afterHeaderSub);

c = c.replace(
  /(\s*\{allOrders\.length\} total\{pendingCount > 0 \? ` · \$\{pendingCount\} need action`[\s\S]*?<\/Text>)\s*(<\/View>)/,
  `$1
          </View>
          <TouchableOpacity
            style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', marginTop: 4 }}
            onPress={() => navigation.getParent()?.navigate('ReportDownload')}>
            <Text style={{ fontSize: 14 }}>\uD83D\uDCE5</Text>
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>Report</Text>
          </TouchableOpacity>
        $2`
);

fs.writeFileSync('./src/screens/OrdersScreen.js', c);
console.log('Done');
console.log('ReportDownload found:', c.includes('ReportDownload'));
