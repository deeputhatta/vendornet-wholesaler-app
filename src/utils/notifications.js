import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotifications() {
  if (!Device.isDevice) {
    console.log('Push notifications only work on physical devices');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Permission not granted for push notifications');
    return null;
  }

  const token = (await Notifications.getExpoPushTokenAsync()).data;
  await AsyncStorage.setItem('fcm_token', token);
  console.log('Push token:', token);
  return token;
}

export function setupNotificationListeners(onNotification, onResponse) {
  const notifListener = Notifications.addNotificationReceivedListener(
    notification => {
      if (onNotification) onNotification(notification);
    }
  );

  const responseListener = Notifications.addNotificationResponseReceivedListener(
    response => {
      if (onResponse) onResponse(response);
    }
  );

  return () => {
    Notifications.removeNotificationSubscription(notifListener);
    Notifications.removeNotificationSubscription(responseListener);
  };
}