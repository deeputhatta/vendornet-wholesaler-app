import React from 'react';
import {
  View, Text, TouchableOpacity,
  StyleSheet, Alert
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { theme, isDark, toggleTheme } = useTheme();
  const c = theme.colors;

  const confirmLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: logout }
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>

      {/* Profile card */}
      <View style={[styles.profileCard, { backgroundColor: c.primary }]}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.name?.charAt(0).toUpperCase() || 'W'}
          </Text>
        </View>
        <Text style={styles.userName}>{user?.name || 'Wholesaler'}</Text>
        <Text style={styles.userMobile}>+91 {user?.mobile}</Text>
        {user?.gstin && (
          <View style={styles.gstinBadge}>
            <Text style={styles.gstinText}>GSTIN: {user.gstin}</Text>
          </View>
        )}
      </View>

      {/* Settings */}
      <View style={[styles.section, {
        backgroundColor: c.surface,
        borderColor: c.border,
      }]}>
        <Text style={[styles.sectionTitle, { color: c.textMuted }]}>
          PREFERENCES
        </Text>

        {/* Theme toggle */}
        <View style={[styles.row, { borderBottomColor: c.borderLight }]}>
          <View style={styles.rowLeft}>
            <Text style={styles.rowIcon}>{isDark ? '🌙' : '☀️'}</Text>
            <Text style={[styles.rowLabel, { color: c.text }]}>
              {isDark ? 'Dark Mode' : 'Light Mode'}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.toggleTrack, {
              backgroundColor: isDark ? c.primary : c.border,
            }]}
            onPress={toggleTheme}
            activeOpacity={0.8}
          >
            <View style={[styles.toggleThumb, {
              transform: [{ translateX: isDark ? 20 : 2 }],
            }]} />
          </TouchableOpacity>
        </View>

        {/* App version */}
        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <Text style={styles.rowIcon}>📱</Text>
            <Text style={[styles.rowLabel, { color: c.text }]}>Version</Text>
          </View>
          <Text style={[styles.rowValue, { color: c.textMuted }]}>1.0.0</Text>
        </View>
      </View>

      {/* Business info */}
      {(user?.business_name || user?.gstin) && (
        <View style={[styles.section, {
          backgroundColor: c.surface,
          borderColor: c.border,
        }]}>
          <Text style={[styles.sectionTitle, { color: c.textMuted }]}>
            BUSINESS INFO
          </Text>
          {user?.business_name && (
            <View style={[styles.row, { borderBottomColor: c.borderLight }]}>
              <View style={styles.rowLeft}>
                <Text style={styles.rowIcon}>🏪</Text>
                <Text style={[styles.rowLabel, { color: c.text }]}>
                  {user.business_name}
                </Text>
              </View>
            </View>
          )}
          {user?.gstin && (
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Text style={styles.rowIcon}>📋</Text>
                <Text style={[styles.rowLabel, { color: c.text }]}>
                  {user.gstin}
                </Text>
              </View>
            </View>
          )}
        </View>
      )}

      {/* Logout */}
      <TouchableOpacity
        style={[styles.logoutBtn, { borderColor: c.error }]}
        onPress={confirmLogout}
      >
        <Text style={[styles.logoutText, { color: c.error }]}>Logout</Text>
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  profileCard: {
    padding: 32, alignItems: 'center', paddingTop: 48,
  },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  avatarText: { fontSize: 32, fontWeight: 'bold', color: '#FFFFFF' },
  userName: { fontSize: 20, fontWeight: '700', color: '#FFFFFF', marginBottom: 4 },
  userMobile: { fontSize: 14, color: 'rgba(255,255,255,0.75)' },
  gstinBadge: {
    marginTop: 10, backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
  },
  gstinText: { color: '#FFFFFF', fontSize: 12, fontWeight: '500' },
  section: {
    margin: 16, marginBottom: 0,
    borderRadius: 12, borderWidth: 1, overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 11, fontWeight: '600',
    paddingHorizontal: 16, paddingTop: 12,
    paddingBottom: 6, letterSpacing: 0.8,
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowIcon: { fontSize: 18 },
  rowLabel: { fontSize: 15 },
  rowValue: { fontSize: 14 },
  toggleTrack: {
    width: 44, height: 26, borderRadius: 13,
    justifyContent: 'center',
  },
  toggleThumb: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2, shadowRadius: 2,
    elevation: 2,
  },
  logoutBtn: {
    margin: 16, marginTop: 20,
    borderRadius: 12, height: 50,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5,
  },
  logoutText: { fontSize: 16, fontWeight: '600' },
});