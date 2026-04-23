const fs = require('fs');

function fix(path, locType) {
  let c = fs.readFileSync(path, 'utf8');
  
  // Find the last registerAndLogin onPress (in location step)
  const lastIdx = c.lastIndexOf('onPress={registerAndLogin}');
  if (lastIdx === -1) {
    console.log('Pattern not found in', path);
    return;
  }
  
  c = c.substring(0, lastIdx) + 
    `onPress={() => {
                if (!lat || !lng) {
                  Alert.alert('Location Required', 'Please detect your ${locType} location or enter coordinates manually.');
                  return;
                }
                registerAndLogin();
              }}` + 
    c.substring(lastIdx + 'onPress={registerAndLogin}'.length);
  
  fs.writeFileSync(path, c);
  console.log('Fixed:', path);
  console.log('Location Required:', c.includes('Location Required'));
}

fix('./src/screens/LoginScreen.js', 'warehouse');
