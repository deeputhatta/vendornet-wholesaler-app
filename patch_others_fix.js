const fs = require('fs');

[
  'C:/Users/leksh/retailer-app2/src/screens/CategoryPickerScreen.js',
  'C:/Users/leksh/wholesaler-app/src/screens/CategoryPickerScreen.js'
].forEach(path => {
  let c = fs.readFileSync(path, 'utf8');

  // Filter out 'others' from the save payload
  c = c.replace(
    `await api.put('/categories/my', { category_ids: selected });`,
    `await api.put('/categories/my', { category_ids: selected.filter(id => id !== 'others') });`
  );

  // Also handle if the format is slightly different
  c = c.replace(
    `category_ids: selected`,
    `category_ids: selected.filter(id => id !== 'others')`
  );

  fs.writeFileSync(path, c);
  console.log('Fixed:', path);
  console.log('filter others:', c.includes("filter(id => id !== 'others')"));
});
