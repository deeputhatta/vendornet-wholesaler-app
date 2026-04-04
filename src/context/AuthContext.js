import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

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