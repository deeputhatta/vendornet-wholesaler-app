const fs = require('fs');

function fix(path) {
  let c = fs.readFileSync(path, 'utf8');

  // Add format helper after imports
  if (!c.includes('formatDisplayDate')) {
    c = c.replace(
      `const CURRENT_YEAR = new Date().getFullYear();`,
      `const formatDisplayDate = (iso) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return d + '/' + m + '/' + y;
};

const CURRENT_YEAR = new Date().getFullYear();`
    );
  }

  // Replace display of customFrom
  c = c.replace(
    `{customFrom || 'Select date'} \uD83D\uDCC5`,
    `{customFrom ? formatDisplayDate(customFrom) : 'DD/MM/YYYY'} \uD83D\uDCC5`
  );
  c = c.replace(
    `{customTo || 'Select date'} \uD83D\uDCC5`,
    `{customTo ? formatDisplayDate(customTo) : 'DD/MM/YYYY'} \uD83D\uDCC5`
  );

  // Also fix the inline text versions
  c = c.replace(
    /{customFrom \? c\.text : c\.textMuted}}>{customFrom \|\| 'Select date'}/g,
    `{customFrom ? c.text : c.textMuted}}>{customFrom ? formatDisplayDate(customFrom) : 'DD/MM/YYYY'}`
  );
  c = c.replace(
    /{customTo \? c\.text : c\.textMuted}}>{customTo \|\| 'Select date'}/g,
    `{customTo ? c.text : c.textMuted}}>{customTo ? formatDisplayDate(customTo) : 'DD/MM/YYYY'}`
  );

  // Fix date summary display
  c = c.replace(
    `customFrom ? \`\${customFrom} to \${customTo||'today'}\` : 'Select dates'`,
    `customFrom ? \`\${formatDisplayDate(customFrom)} to \${customTo ? formatDisplayDate(customTo) : 'today'}\` : 'Select dates'`
  );

  fs.writeFileSync(path, c);
  console.log('Fixed:', path);
  console.log('formatDisplayDate found:', c.includes('formatDisplayDate'));
}

fix('./src/screens/ReportDownloadScreen.js');
