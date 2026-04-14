import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('token');
      const storedUser = await AsyncStorage.getItem('user');
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch (err) {
      console.error('Auth load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const login = async (tokenData, userData) => {
    await AsyncStorage.setItem('token', tokenData.token);
    await AsyncStorage.setItem('refresh_token', tokenData.refresh_token);
    await AsyncStorage.setItem('user', JSON.stringify(userData));
    setToken(tokenData.token);
    setUser(userData);

    // Save FCM token to backend
    try {
      const fcmToken = await AsyncStorage.getItem('fcm_token');
      if (fcmToken) {
        await api.post('/users/fcm-token', { fcm_token: fcmToken });
        console.log('FCM token saved to backend');
      }
    } catch (err) {
      console.log('FCM token save failed:', err.message);
    }
  };

  const logout = async () => {
    await AsyncStorage.multiRemove(['token', 'refresh_token', 'user']);
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);