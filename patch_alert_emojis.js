const fs = require('fs');

function fix(path) {
  let c = fs.readFileSync(path, 'utf8');
  c = c.replace(/text: 'Save to Downloads'/g, "text: '\uD83D\uDCC2 Save to Downloads'");
  c = c.replace(/text: 'Share \/ Open in Sheets'/g, "text: '\uD83D\uDCE4 Share / Open in Sheets'");
  c = c.replace(/text: 'Cancel', style: 'cancel'/g, "text: '\u274C Cancel', style: 'cancel'");
  fs.writeFileSync(path, c);
  console.log('Fixed:', path);
}

fix('./src/screens/ReportDownloadScreen.js');
