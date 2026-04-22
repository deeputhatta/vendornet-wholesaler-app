const fs = require('fs');
let c = fs.readFileSync('./src/screens/OrdersScreen.js', 'utf8');

// Find the entire header section and replace it
const headerStart = c.indexOf('<View style={[styles.header, { backgroundColor: c.primary }]}>');
const headerEnd = c.indexOf('</View>', headerStart);
const afterHeader = c.indexOf('\n', headerEnd) + 1;

// Find where header ends (after the closing </View> of header)
// Look for the filter section which comes right after
const filterStart = c.indexOf('{/* Date filter */}');

const oldHeader = c.substring(headerStart, filterStart);
console.log('Old header:\n', oldHeader);

const newHeader = `<View style={[styles.header, { backgroundColor: c.primary }]}>
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
          </TouchableOpacity>
        </View>
      </View>
      `;

c = c.substring(0, headerStart) + newHeader + c.substring(filterStart);
fs.writeFileSync('./src/screens/OrdersScreen.js', c);

// Verify
const i = c.indexOf('styles.header');
console.log('\nNew header:\n', c.substring(i-5, i+500));
