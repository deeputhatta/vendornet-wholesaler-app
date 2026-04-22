const fs = require('fs');
let c = fs.readFileSync('./src/screens/ReportDownloadScreen.js', 'utf8');

// Replace From date TouchableOpacity
c = c.replace(
  `<TouchableOpacity style={[styles.dateInput, { backgroundColor: c.surfaceSecondary, borderColor: customFrom ? c.primary : c.border }]}
                  onPress={() => Alert.prompt('From Date', 'Enter date (YYYY-MM-DD)', setCustomFrom, 'plain-text', customFrom, 'numeric')}>
                  <Text style={[{ color: customFrom ? c.text : c.textMuted, fontSize: 15 }]}>{customFrom || 'YYYY-MM-DD'}</Text>
                </TouchableOpacity>`,
  `<TouchableOpacity style={[styles.dateInput, { backgroundColor: c.surfaceSecondary, borderColor: customFrom ? c.primary : c.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}
                  onPress={() => setShowFromPicker(true)}>
                  <Text style={{ color: customFrom ? c.text : c.textMuted, fontSize: 14 }}>{customFrom ? formatDisplayDate(customFrom) : 'DD/MM/YYYY'}</Text>
                  <Text style={{ fontSize: 16 }}>\uD83D\uDCC5</Text>
                </TouchableOpacity>
                {showFromPicker && (
                  <DateTimePicker
                    value={customFrom ? new Date(customFrom) : new Date()}
                    mode="date"
                    display="default"
                    onChange={(event, date) => { setShowFromPicker(false); if (date) setCustomFrom(date.toISOString().slice(0,10)); }}
                  />
                )}`
);

// Find and replace To date TouchableOpacity
c = c.replace(
  `<TouchableOpacity style={[styles.dateInput, { backgroundColor: c.surfaceSecondary, borderColor: customTo ? c.primary : c.border }]}
                  onPress={() => Alert.prompt('To Date', 'Enter date (YYYY-MM-DD)', setCustomTo, 'plain-text', customTo, 'numeric')}>
                  <Text style={[{ color: customTo ? c.text : c.textMuted, fontSize: 15 }]}>{customTo || 'YYYY-MM-DD'}</Text>
                </TouchableOpacity>`,
  `<TouchableOpacity style={[styles.dateInput, { backgroundColor: c.surfaceSecondary, borderColor: customTo ? c.primary : c.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}
                  onPress={() => setShowToPicker(true)}>
                  <Text style={{ color: customTo ? c.text : c.textMuted, fontSize: 14 }}>{customTo ? formatDisplayDate(customTo) : 'DD/MM/YYYY'}</Text>
                  <Text style={{ fontSize: 16 }}>\uD83D\uDCC5</Text>
                </TouchableOpacity>
                {showToPicker && (
                  <DateTimePicker
                    value={customTo ? new Date(customTo) : new Date()}
                    mode="date"
                    display="default"
                    onChange={(event, date) => { setShowToPicker(false); if (date) setCustomTo(date.toISOString().slice(0,10)); }}
                  />
                )}`
);

fs.writeFileSync('./src/screens/ReportDownloadScreen.js', c);
console.log('Alert.prompt remaining:', (c.match(/Alert\.prompt/g)||[]).length);
console.log('DateTimePicker count:', (c.match(/DateTimePicker/g)||[]).length);
