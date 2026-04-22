import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, Alert, ActivityIndicator
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { usePermissions } from '../context/PermissionContext';
import api from '../services/api';

export default function ProfileScreen({ navigation }) {
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  const { isAdmin } = usePermissions();
  const c = theme.colors;
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadStats(); }, []);

  const loadStats = async () => {
    try {
      const [ordersRes, listingsRes] = await Promise.all([
        api.get('/orders/wholesaler/all?limit=200'),
        api.get('/listings/my').catch(() => ({ data: { listings: [] } })),
      ]);
      const orders = ordersRes.data.sub_orders || [];
      const listings = listingsRes.data.listings || [];
      const delivered = orders.filter(o => ['delivered','completed','invoice_uploaded'].includes(o.status));
      const revenue = delivered.reduce((s,o) => s+parseFloat(o.total_amount||0),0);
      setStats({
        totalOrders: orders.length,
        revenue,
        activeListings: listings.filter(l => l.is_active).length,
        deliveryRate: orders.length > 0 ? ((delivered.length/orders.length)*100).toFixed(0) : 0,
      });
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const confirmLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout }
    ]);
  };

  const initials = user?.name?.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase() || 'W';
  const formatAmount = (v) => v >= 100000 ? `₹${(v/100000).toFixed(1)}L` : v >= 1000 ? `₹${(v/1000).toFixed(1)}K` : `₹${v}`;

  const MenuItem = ({ icon, label, value, onPress, arrow = true, color }) => (
    <TouchableOpacity
      style={[styles.menuRow, { borderBottomColor: c.borderLight }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}>
      <View style={[styles.menuIconBox, { backgroundColor: c.surfaceSecondary }]}>
        <Text style={{ fontSize: 18 }}>{icon}</Text>
      </View>
      <Text style={[styles.menuLabel, { color: color || c.text }]}>{label}</Text>
      <View style={styles.menuRight}>
        {value && <Text style={[styles.menuValue, { color: c.textMuted }]} numberOfLines={1}>{value}</Text>}
        {arrow && onPress && <Text style={[styles.menuArrow, { color: c.textMuted }]}>›</Text>}
      </View>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={[styles.container, { backgroundColor: c.background }]} showsVerticalScrollIndicator={false}>

      {/* Header */}
      <View style={[styles.header, { backgroundColor: '#085041' }]}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.userName}>{user?.name || 'Wholesaler'}</Text>
        <Text style={styles.userMobile}>+91 {user?.mobile}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleBadgeText}>{isAdmin ? '👑 Admin' : '👤 Staff'}</Text>
        </View>
      </View>

      {/* Stats */}
      {loading ? (
        <View style={[styles.statsRow, { backgroundColor: c.surface }]}>
          <ActivityIndicator color={c.primary} />
        </View>
      ) : (
        <View style={[styles.statsRow, { backgroundColor: c.surface, borderBottomColor: c.borderLight }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#1D9E75' }]}>{stats?.totalOrders || 0}</Text>
            <Text style={[styles.statLabel, { color: c.textMuted }]}>Orders</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: c.borderLight }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#1D9E75' }]}>{formatAmount(stats?.revenue || 0)}</Text>
            <Text style={[styles.statLabel, { color: c.textMuted }]}>Revenue</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: c.borderLight }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#1D9E75' }]}>{stats?.deliveryRate || 0}%</Text>
            <Text style={[styles.statLabel, { color: c.textMuted }]}>Delivery Rate</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: c.borderLight }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#1D9E75' }]}>{stats?.activeListings || 0}</Text>
            <Text style={[styles.statLabel, { color: c.textMuted }]}>Listings</Text>
          </View>
        </View>
      )}

      {/* Account */}
      <View style={[styles.section, { backgroundColor: c.surface }]}>
        <Text style={[styles.sectionTitle, { color: c.textMuted }]}>ACCOUNT</Text>
        <MenuItem icon="👤" label="Name" value={user?.name} arrow={false} />
        <MenuItem icon="📱" label="Mobile" value={`+91 ${user?.mobile}`} arrow={false} />
        {user?.business_name && <MenuItem icon="🏪" label="Business" value={user.business_name} arrow={false} />}
        {user?.gstin && <MenuItem icon="📋" label="GSTIN" value={user.gstin} arrow={false} />}
      </View>

      {/* Business */}
      <View style={[styles.section, { backgroundColor: c.surface }]}>
        <Text style={[styles.sectionTitle, { color: c.textMuted }]}>BUSINESS</Text>
        <MenuItem icon="📦" label="My Orders" onPress={() => navigation.navigate('Orders')} />
        <MenuItem icon="🏷" label="Inventory" onPress={() => navigation.navigate('Inventory')} />
        <MenuItem icon="📊" label="Analytics" onPress={() => navigation.navigate('Analytics')} />
        <MenuItem icon="🏷" label="My Categories" onPress={() => navigation.navigate('CategoryPicker')} />
      </View>

      {/* Reports */}
      <View style={[styles.section, { backgroundColor: c.surface }]}>
        <Text style={[styles.sectionTitle, { color: c.textMuted }]}>REPORTS</Text>
        <MenuItem icon="📥" label="Download Report" onPress={() => navigation.getParent()?.navigate('ReportDownload')} />
      </View>

      {/* Staff — admin only */}
      {isAdmin && (
        <View style={[styles.section, { backgroundColor: c.surface }]}>
          <Text style={[styles.sectionTitle, { color: c.textMuted }]}>MANAGEMENT</Text>
          <MenuItem icon="👥" label="Staff Management" onPress={() => navigation.navigate('Staff')} />
        </View>
      )}

      {/* App */}
      <View style={[styles.section, { backgroundColor: c.surface }]}>
        <Text style={[styles.sectionTitle, { color: c.textMuted }]}>APP</Text>
        <MenuItem icon="📱" label="Version" value="1.0.0" arrow={false} />
        <MenuItem icon="🌐" label="Website" value="vendornet.in" arrow={false} />
      </View>

      {/* Logout */}
      <TouchableOpacity
        style={[styles.logoutBtn, { borderColor: c.error || '#FF453A' }]}
        onPress={confirmLogout}>
        <Text style={[styles.logoutText, { color: c.error || '#FF453A' }]}>Logout</Text>
      </TouchableOpacity>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 52, paddingBottom: 24, alignItems: 'center' },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { fontSize: 32, fontWeight: '800', color: '#fff' },
  userName: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 4 },
  userMobile: { fontSize: 14, color: 'rgba(255,255,255,0.75)', marginBottom: 10 },
  roleBadge: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5 },
  roleBadgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  statsRow: { flexDirection: 'row', padding: 16, borderBottomWidth: 1 },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 16, fontWeight: '800', marginBottom: 3 },
  statLabel: { fontSize: 10, textAlign: 'center' },
  statDivider: { width: 1, marginVertical: 4 },
  section: { marginTop: 12, marginHorizontal: 16, borderRadius: 14, overflow: 'hidden' },
  sectionTitle: { fontSize: 11, fontWeight: '600', letterSpacing: 0.8, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6 },
  menuRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 0.5, gap: 12 },
  menuIconBox: { width: 34, height: 34, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  menuLabel: { flex: 1, fontSize: 15 },
  menuRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  menuValue: { fontSize: 13, maxWidth: 160, textAlign: 'right' },
  menuArrow: { fontSize: 20, fontWeight: '300' },
  logoutBtn: { margin: 16, marginTop: 20, borderRadius: 12, height: 50, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5 },
  logoutText: { fontSize: 16, fontWeight: '600' },
});
