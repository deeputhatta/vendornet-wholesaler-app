import React from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { usePermissions } from '../context/PermissionContext';

import LoginScreen from '../screens/LoginScreen';
import OrdersScreen from '../screens/OrdersScreen';
import AssignDriverScreen from '../screens/AssignDriverScreen';
import UploadInvoiceScreen from '../screens/UploadInvoiceScreen';
import ProfileScreen from '../screens/ProfileScreen';
import CategoryPickerScreen from '../screens/CategoryPickerScreen';
import DashboardScreen from '../screens/DashboardScreen';
import AnalyticsScreen from '../screens/AnalyticsScreen';
import InventoryScreen from '../screens/InventoryScreen';
import StaffManagementScreen from '../screens/StaffManagementScreen';
import ReportDownloadScreen from '../screens/ReportDownloadScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function HomeTabs() {
  const { theme } = useTheme();
  const { isAdmin, can } = usePermissions();
  const c = theme.colors;

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: c.tabBarActive,
        tabBarInactiveTintColor: c.tabBarInactive,
        tabBarStyle: { backgroundColor: c.tabBar, borderTopColor: c.border, borderTopWidth: 1 },
        headerStyle: { backgroundColor: c.surface },
        headerTintColor: c.text,
        headerTitleStyle: { fontWeight: '600', color: c.text },
      }}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen}
        options={{ tabBarLabel: 'Home', tabBarIcon: () => <Text style={{ fontSize: 20 }}>🏠</Text>, headerShown: false }} />

      {can('view_orders') && (
        <Tab.Screen name="Orders" component={OrdersScreen}
          options={{ tabBarLabel: 'Orders', tabBarIcon: () => <Text style={{ fontSize: 20 }}>📦</Text>, headerShown: false }} />
      )}

      {can('manage_listings') && (
        <Tab.Screen name="Inventory" component={InventoryScreen}
          options={{ tabBarLabel: 'Inventory', tabBarIcon: () => <Text style={{ fontSize: 20 }}>🏷</Text>, headerShown: false }} />
      )}

      {can('view_analytics') && (
        <Tab.Screen name="Analytics" component={AnalyticsScreen}
          options={{ tabBarLabel: 'Reports', tabBarIcon: () => <Text style={{ fontSize: 20 }}>📊</Text>, headerShown: false }} />
      )}

      {isAdmin && (
        <Tab.Screen name="Staff" component={StaffManagementScreen}
          options={{ tabBarLabel: 'Staff', tabBarIcon: () => <Text style={{ fontSize: 20 }}>👥</Text>, headerShown: false }} />
      )}

      <Tab.Screen name="Profile" component={ProfileScreen}
        options={{ tabBarLabel: 'Profile', tabBarIcon: () => <Text style={{ fontSize: 20 }}>👤</Text>, headerShown: false }} />
    </Tab.Navigator>
  );
}

function MainStack() {
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

export default function AppNavigator() {
  const { user, loading } = useAuth();
  const { theme } = useTheme();
  const c = theme.colors;

  if (loading) return null;

  const navTheme = {
    ...(theme.dark ? DarkTheme : DefaultTheme),
    dark: theme.dark,
    colors: {
      primary: c.primary,
      background: c.background,
      card: c.surface,
      text: c.text,
      border: c.border,
      notification: c.primary,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <Stack.Screen name="MainStack" component={MainStack} />
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}


