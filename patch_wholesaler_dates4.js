const fs = require('fs');
let c = fs.readFileSync('./src/screens/ReportDownloadScreen.js', 'utf8');

// Find and replace using index positions
const fromPickerNew = `<TouchableOpacity style={[styles.dateInput, { backgroundColor: c.surfaceSecondary, borderColor: customFrom ? c.primary : c.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}
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
                )}`;

const toPickerNew = `<TouchableOpacity style={[styles.dateInput, { backgroundColor: c.surfaceSecondary, borderColor: customTo ? c.primary : c.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}
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
                )}`;

// Find From block: from <TouchableOpacity to </TouchableOpacity> containing Alert.prompt From Date
const fromStart = c.indexOf('<TouchableOpacity style={[styles.dateInput', c.indexOf('From Date') - 200);
const fromEnd = c.indexOf('</TouchableOpacity>', fromStart) + '</TouchableOpacity>'.length;
console.log('From block:', JSON.stringify(c.substring(fromStart, fromEnd)));
c = c.substring(0, fromStart) + fromPickerNew + c.substring(fromEnd);

// Find To block: from <TouchableOpacity to </TouchableOpacity> containing Alert.prompt To Date
const toStart = c.indexOf('<TouchableOpacity style={[styles.dateInput', c.indexOf('To Date') - 200);
const toEnd = c.indexOf('</TouchableOpacity>', toStart) + '</TouchableOpacity>'.length;
console.log('To block:', JSON.stringify(c.substring(toStart, toEnd)));
c = c.substring(0, toStart) + toPickerNew + c.substring(toEnd);

fs.writeFileSync('./src/screens/ReportDownloadScreen.js', c);
console.log('Alert.prompt remaining:', (c.match(/Alert\.prompt/g)||[]).length);
console.log('setShowFromPicker:', c.includes('setShowFromPicker(true)'));
