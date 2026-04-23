const fs = require('fs');

['C:/Users/leksh/retailer-app2/src/screens/CategoryPickerScreen.js',
 'C:/Users/leksh/wholesaler-app/src/screens/CategoryPickerScreen.js'].forEach(path => {
  let c = fs.readFileSync(path, 'utf8');
  
  const before = (c.match(/onCategoryDone|navigation\.reset/g)||[]).length;
  
  // Replace any navigation.reset with callback
  c = c.replace(
    /navigation\.reset\(\{[^}]+\}\);/g,
    `if (callbacks.onCategoryDone) callbacks.onCategoryDone();`
  );

  // Make sure callbacks is imported
  if (!c.includes("from '../utils/callbacks'")) {
    c = c.replace(
      `import React, { useState, useEffect } from 'react';`,
      `import React, { useState, useEffect } from 'react';
import { callbacks } from '../utils/callbacks';`
    );
  }

  fs.writeFileSync(path, c);
  console.log('Fixed:', path);
  console.log('reset remaining:', (c.match(/navigation\.reset/g)||[]).length);
  console.log('onCategoryDone:', c.includes('onCategoryDone'));
});
