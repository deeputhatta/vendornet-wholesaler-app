import React, { createContext, useContext } from 'react';
import { useAuth } from './AuthContext';

const PermissionContext = createContext(null);

export const PermissionProvider = ({ children }) => {
  const { user } = useAuth();

  const isAdmin = user?.role === 'wholesaler_admin';
  const isStaff = user?.role === 'wholesaler_staff';
  const permissions = user?.permissions || {};

  const can = (permission) => {
    if (isAdmin) return true;
    return permissions[permission] === true;
  };

  return (
    <PermissionContext.Provider value={{ isAdmin, isStaff, permissions, can }}>
      {children}
    </PermissionContext.Provider>
  );
};

export const usePermissions = () => useContext(PermissionContext);