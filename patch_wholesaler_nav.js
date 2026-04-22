const fs = require('fs');
let c = fs.readFileSync('./src/navigation/AppNavigator.js', 'utf8');

// Replace entire MainStack function
const oldMainStack = c.substring(c.indexOf('function MainStack()'), c.indexOf('export default function AppNavigator'));

const newMainStack = `function MainStack() {
  const { theme } = useTheme();
  const c = theme.colors;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main" component={HomeTabs} />
      <Stack.Screen name="AssignDriver" component={AssignDriverScreen}
        options={{ headerShown: true, headerTitle: 'Assign Driver', headerStyle: { backgroundColor: c.surface }, headerTintColor: c.text, headerTitleStyle: { fontWeight: '600' }, headerBackTitle: '' }} />
      <Stack.Screen name="UploadInvoice" component={UploadInvoiceScreen}
        options={{ headerShown: true, headerTitle: 'Upload Invoice', headerStyle: { backgroundColor: c.surface }, headerTintColor: c.text, headerTitleStyle: { fontWeight: '600' }, headerBackTitle: '' }} />
      <Stack.Screen name="ReportDownload" component={ReportDownloadScreen}
        options={{ headerShown: false }} />
      <Stack.Screen name="CategoryPicker" component={CategoryPickerScreen}
        options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

`;

c = c.replace(oldMainStack, newMainStack);
fs.writeFileSync('./src/navigation/AppNavigator.js', c);
console.log('Done');
