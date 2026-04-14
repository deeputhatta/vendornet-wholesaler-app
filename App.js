import { useEffect, useRef } from 'react';
import { AuthProvider } from './src/context/AuthContext';
import { ThemeProvider } from './src/context/ThemeContext';
import AppNavigator from './src/navigation/AppNavigator';
import {
  registerForPushNotifications,
  setupNotificationListeners
} from './src/utils/notifications';

export default function App() {
  useEffect(() => {
    registerForPushNotifications();
    const cleanup = setupNotificationListeners(
      notification => console.log('New order notification:', notification),
      response => console.log('Notification tapped — go to orders')
    );
    return cleanup;
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </ThemeProvider>
  );
}