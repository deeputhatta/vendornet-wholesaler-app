const fs = require('fs');
let c = fs.readFileSync('./src/screens/CategoryPickerScreen.js', 'utf8');

// Find and replace the isOnboarding block using index
const start = c.indexOf('if (isOnboarding) {');
const end = c.indexOf('}', start) + 1;
const oldBlock = c.substring(start, end);
console.log('Old block:', oldBlock);

const newBlock = `if (isOnboarding) {
        if (callbacks.onCategoryDone) callbacks.onCategoryDone();
      }`;

c = c.substring(0, start) + newBlock + c.substring(end);

// Add callbacks import if missing
if (!c.includes("from '../utils/callbacks'")) {
  c = c.replace(
    `import React, { useState, useEffect } from 'react';`,
    `import React, { useState, useEffect } from 'react';
import { callbacks } from '../utils/callbacks';`
  );
}

fs.writeFileSync('./src/screens/CategoryPickerScreen.js', c);
console.log('Fixed');
console.log('onCategoryDone:', c.includes('onCategoryDone'));
console.log('reset remaining:', c.includes('navigation.reset'));
