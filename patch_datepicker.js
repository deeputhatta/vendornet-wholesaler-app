const fs = require('fs');

function fixDatePicker(path) {
  let c = fs.readFileSync(path, 'utf8');

  // Add DateTimePicker import
  if (!c.includes('DateTimePicker')) {
    c = c.replace(
      `import api from '../services/api';`,
      `import api from '../services/api';
import DateTimePicker from '@react-native-community/datetimepicker';`
    );
  }

  // Add date picker states after existing states
  if (!c.includes('showFromPicker')) {
    c = c.replace(
      `  const [downloading, setDownloading] = useState(false);`,
      `  const [downloading, setDownloading] = useState(false);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);`
    );
  }

  // Replace Alert.prompt based date inputs with proper TextInput + DatePicker
  const oldFromInput = `<TouchableOpacity style={[styles.dateInput, { backgroundColor: c.surfaceSecondary||'#2C2C2E', borderColor: customFrom ? c.primary : c.border }]}
                  onPress={() => Alert.prompt('From Date', 'YYYY-MM-DD', setCustomFrom, 'plain-text', customFrom)}>
                  <Text style={{ color: customFrom ? c.text : c.textMuted }}>{customFrom || 'YYYY-MM-DD'}</Text>
                </TouchableOpacity>`;

  const newFromInput = `<TouchableOpacity
                  style={[styles.dateInput, { backgroundColor: c.surfaceSecondary||'#2C2C2E', borderColor: customFrom ? c.primary : c.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
                  onPress={() => setShowFromPicker(true)}>
                  <Text style={{ color: customFrom ? c.text : c.textMuted, fontSize: 14 }}>{customFrom || 'Select date'}</Text>
                  <Text style={{ fontSize: 16 }}>\uD83D\uDCC5</Text>
                </TouchableOpacity>
                {showFromPicker && (
                  <DateTimePicker
                    value={customFrom ? new Date(customFrom) : new Date()}
                    mode="date"
                    display="default"
                    onChange={(event, date) => {
                      setShowFromPicker(false);
                      if (date) setCustomFrom(date.toISOString().slice(0,10));
                    }}
                  />
                )}`;

  const oldToInput = `<TouchableOpacity style={[styles.dateInput, { backgroundColor: c.surfaceSecondary||'#2C2C2E', borderColor: customTo ? c.primary : c.border }]}
                  onPress={() => Alert.prompt('To Date', 'YYYY-MM-DD', setCustomTo, 'plain-text', customTo)}>
                  <Text style={{ color: customTo ? c.text : c.textMuted }}>{customTo || 'YYYY-MM-DD'}</Text>
                </TouchableOpacity>`;

  const newToInput = `<TouchableOpacity
                  style={[styles.dateInput, { backgroundColor: c.surfaceSecondary||'#2C2C2E', borderColor: customTo ? c.primary : c.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
                  onPress={() => setShowToPicker(true)}>
                  <Text style={{ color: customTo ? c.text : c.textMuted, fontSize: 14 }}>{customTo || 'Select date'}</Text>
                  <Text style={{ fontSize: 16 }}>\uD83D\uDCC5</Text>
                </TouchableOpacity>
                {showToPicker && (
                  <DateTimePicker
                    value={customTo ? new Date(customTo) : new Date()}
                    mode="date"
                    display="default"
                    onChange={(event, date) => {
                      setShowToPicker(false);
                      if (date) setCustomTo(date.toISOString().slice(0,10));
                    }}
                  />
                )}`;

  if (c.includes(oldFromInput)) {
    c = c.replace(oldFromInput, newFromInput);
    console.log('From picker replaced');
  } else {
    console.log('From picker pattern not found — trying alternate');
    // Try alternate pattern from wholesaler app
    c = c.replace(
      /onPress=\{.*?Alert\.prompt\('From Date'[\s\S]*?\}\)>/,
      `onPress={() => setShowFromPicker(true)}>`
    );
    c = c.replace(
      /<Text style=\{\[.*?\}\]>\{customFrom \|\| 'YYYY-MM-DD'\}<\/Text>\s*<\/TouchableOpacity>/,
      `<Text style={{ color: customFrom ? c.text : c.textMuted }}>{customFrom || 'Select date'} \uD83D\uDCC5</Text>
                </TouchableOpacity>
                {showFromPicker && (
                  <DateTimePicker
                    value={customFrom ? new Date(customFrom) : new Date()}
                    mode="date"
                    display="default"
                    onChange={(event, date) => {
                      setShowFromPicker(false);
                      if (date) setCustomFrom(date.toISOString().slice(0,10));
                    }}
                  />
                )}`
    );
  }

  if (c.includes(oldToInput)) {
    c = c.replace(oldToInput, newToInput);
    console.log('To picker replaced');
  } else {
    console.log('To picker pattern not found — trying alternate');
    c = c.replace(
      /onPress=\{.*?Alert\.prompt\('To Date'[\s\S]*?\}\)>/,
      `onPress={() => setShowToPicker(true)}>`
    );
    c = c.replace(
      /<Text style=\{\[.*?\}\]>\{customTo \|\| 'YYYY-MM-DD'\}<\/Text>\s*<\/TouchableOpacity>/,
      `<Text style={{ color: customTo ? c.text : c.textMuted }}>{customTo || 'Select date'} \uD83D\uDCC5</Text>
                </TouchableOpacity>
                {showToPicker && (
                  <DateTimePicker
                    value={customTo ? new Date(customTo) : new Date()}
                    mode="date"
                    display="default"
                    onChange={(event, date) => {
                      setShowToPicker(false);
                      if (date) setCustomTo(date.toISOString().slice(0,10));
                    }}
                  />
                )}`
    );
  }

  fs.writeFileSync(path, c);
  console.log('Done:', path);
  console.log('DateTimePicker found:', c.includes('DateTimePicker'));
  console.log('showFromPicker found:', c.includes('showFromPicker'));
}

fixDatePicker('./src/screens/ReportDownloadScreen.js');
