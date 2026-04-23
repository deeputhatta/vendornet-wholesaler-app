const fs = require('fs');

function fix(path, appType) {
  let c = fs.readFileSync(path, 'utf8');
  
  // Find the Create Account button onPress and add location validation before it
  c = c.replace(
    `onPress={registerAndLogin} disabled={loading}>`,
    `onPress={() => {
                if (!lat || !lng) {
                  Alert.alert('Location Required', 'Please detect your ${appType} location or enter coordinates manually.');
                  return;
                }
                registerAndLogin();
              }} disabled={loading}>`
  );
  
  fs.writeFileSync(path, c);
  console.log('Fixed:', path, '| Location Required:', c.includes('Location Required'));
}

fix('./src/screens/LoginScreen.js', 'warehouse');
