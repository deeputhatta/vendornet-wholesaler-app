const fs = require('fs');
let c = fs.readFileSync('./src/screens/ReportDownloadScreen.js', 'utf8');

// Add DateTimePicker import if not present
if (!c.includes('DateTimePicker')) {
  c = c.replace(
    `import api from '../services/api';`,
    `import api from '../services/api';
import DateTimePicker from '@react-native-community/datetimepicker';`
  );
}

// Add format helper
if (!c.includes('formatDisplayDate')) {
  c = c.replace(
    `const CURRENT_YEAR = new Date().getFullYear();`,
    `const formatDisplayDate = (iso) => {
  if (!iso) return 'DD/MM/YYYY';
  const [y, m, d] = iso.split('-');
  return d + '/' + m + '/' + y;
};

const CURRENT_YEAR = new Date().getFullYear();`
  );
}

// Add picker states if not present
if (!c.includes('showFromPicker')) {
  c = c.replace(
    `  const [downloading, setDownloading] = useState(false);`,
    `  const [downloading, setDownloading] = useState(false);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);`
  );
}

// Replace From date input
c = c.replace(
  /onPress=\{\(\) => Alert\.prompt\('From Date'[\s\S]*?\}\)>/,
  `onPress={() => setShowFromPicker(true)}>`
);
c = c.replace(
  /<Text style=\{\[.*?\}\]>\{customFrom \|\| 'YYYY[\s\S]*?<\/Text>\s*<\/TouchableOpacity>\s*(<\/View>)/,
  `<Text style={{ color: customFrom ? c.text : c.textMuted, fontSize: 14 }}>{formatDisplayDate(customFrom)} 📅</Text>
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
                )}
              $1`
);

// Replace To date input
c = c.replace(
  /onPress=\{\(\) => Alert\.prompt\('To Date'[\s\S]*?\}\)>/,
  `onPress={() => setShowToPicker(true)}>`
);
c = c.replace(
  /<Text style=\{\[.*?\}\]>\{customTo \|\| 'YYYY[\s\S]*?<\/Text>\s*<\/TouchableOpacity>\s*(<\/View>)/,
  `<Text style={{ color: customTo ? c.text : c.textMuted, fontSize: 14 }}>{formatDisplayDate(customTo)} 📅</Text>
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
                )}
              $1`
);

// Fix date summary
c = c.replace(
  `customFrom ? \`\${customFrom} to \${customTo || 'today'}\` : 'Select dates'`,
  `customFrom ? \`\${formatDisplayDate(customFrom)} to \${customTo ? formatDisplayDate(customTo) : 'today'}\` : 'Select dates'`
);

fs.writeFileSync('./src/screens/ReportDownloadScreen.js', c);
console.log('Done');
console.log('DateTimePicker:', c.includes('DateTimePicker'));
console.log('showFromPicker:', c.includes('showFromPicker'));
console.log('Alert.prompt remaining:', (c.match(/Alert\.prompt/g)||[]).length);
