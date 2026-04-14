import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
  Animated
} from 'react-native';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { usePermissions } from '../context/PermissionContext';
import VendorNetLogo from '../components/VendorNetLogo';

export default function DashboardScreen({ navigation }) {
  const [stats, setStats] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();
  const { theme } = useTheme();
  const { isAdmin, can } = usePermissions();
  const c = theme.colors;

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

useFocusEffect(
  React.useCallback(() => {
    loadDashboard();
  }, [])
);

 
  const loadDashboard = async () => {
    try {
      const [pendingRes, listingsRes] = await Promise.all([
        api.get('/orders/pending'),
        api.get('/listings/my').catch(() => ({ data: { listings: [] } })),
      ]);

      const pending = pendingRes.data.sub_orders || [];
      const allListings = listingsRes.data.listings || [];
const activeListings = allListings.filter(l => l.is_active === true);
console.log('RAW listings:', JSON.stringify(allListings.map(l => ({id: l.listing_id.slice(0,8), is_active: l.is_active, type: typeof l.is_active}))));
console.log('Active count:', activeListings.length);

     

      const totalRevenue = pending.reduce((sum, o) =>
        sum + parseFloat(o.total_amount || 0), 0
      );
      const lowStock = activeListings.filter(l => l.stock_qty < 10).length;

      setStats({
        pending: pending.length,
        totalListings: activeListings.length,
        lowStock,
        revenue: totalRevenue,
      });
      setRecentOrders(pending.slice(0, 3));
      setListings(activeListings.slice(0, 3));

      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]).start();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long'
  });

  if (loading) return (
    <View style={[styles.loading, { backgroundColor: c.background }]}>
      <ActivityIndicator size="large" color={c.primary} />
      <Text style={[styles.loadingText, { color: c.textMuted }]}>Loading dashboard...</Text>
    </View>
  );

  const quickActions = [
    can('view_orders') && {
      icon: '📦', label: 'Manage\nOrders', color: '#0A84FF',
      bg: '#001830', border: '#0A2A50',
      onPress: () => navigation.navigate('Orders'),
      badge: stats?.pending > 0 ? stats.pending : null,
    },
    can('view_analytics') && {
      icon: '📈', label: 'Analytics', color: '#30D158',
      bg: '#003A10', border: '#0A3A20',
      onPress: () => navigation.navigate('Analytics'),
    },
    can('manage_listings') && {
      icon: '🏷', label: 'Products', color: '#F2C94C',
      bg: '#2A1F00', border: '#3A2F00',
      onPress: () => navigation.navigate('Products'),
    },
    isAdmin && {
      icon: '👥', label: 'Staff', color: '#BF5AF2',
      bg: '#1A0A2E', border: '#2A1A4E',
      onPress: () => navigation.navigate('Staff'),
    },
    {
      icon: '👤', label: 'My\nProfile', color: '#0A84FF',
      bg: '#001830', border: '#0A2A50',
      onPress: () => navigation.navigate('Profile'),
    },
  ].filter(Boolean);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: c.background }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); loadDashboard(); }}
          tintColor="#fff" colors={[c.primary]}
        />
      }
    >
      {/* ══ SECTION 1 — BRAND ══ */}
      <View style={styles.brandSection}>
        <View style={styles.brandRow}>
          <View style={styles.logoBox}>
            <VendorNetLogo size={52} />
          </View>
          <View style={styles.brandText}>
            <Text style={styles.brandName}>
              <Text style={{ color: '#FFFFFF' }}>Vendor</Text>
              <Text style={{ color: '#F2C94C' }}>Net</Text>
            </Text>
            <Text style={styles.brandTagline}>WHOLESALER PORTAL</Text>
          </View>
          {stats?.pending > 0 && (
            <TouchableOpacity
              style={styles.notifBtn}
              onPress={() => navigation.navigate('Orders')}
            >
              <Text style={styles.notifIcon}>🔔</Text>
              <View style={styles.notifBadge}>
                <Text style={styles.notifCount}>{stats.pending}</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ══ SECTION 2 — GREETING ══ */}
      <View style={styles.greetSection}>
        <View style={styles.greetCard}>
          <Text style={styles.greeting}>
            {getGreeting()}, {user?.name?.split(' ')[0] || 'there'} 👋
          </Text>
          <Text style={styles.greetDate}>{today}</Text>
        </View>

        <View style={styles.revenueCard}>
          <View style={styles.revenueLeft}>
            <Text style={styles.revenueLabel}>PENDING REVENUE</Text>
            <Text style={styles.revenueValue}>
              ₹{stats?.revenue >= 100000
                ? `${(stats.revenue / 100000).toFixed(2)}L`
                : stats?.revenue >= 1000
                ? `${(stats.revenue / 1000).toFixed(1)}K`
                : (stats?.revenue || 0).toFixed(0)}
            </Text>
            <Text style={styles.revenueSubLabel}>
              from {stats?.pending || 0} active orders
            </Text>
          </View>
          <View style={styles.revenueDivider} />
          <View style={styles.revenueRight}>
            <View style={styles.revenueMetric}>
              <Text style={styles.revenueMetricValue}>{stats?.totalListings || 0}</Text>
              <Text style={styles.revenueMetricLabel}>Listings</Text>
            </View>
            <View style={styles.revenueMetric}>
              <Text style={[styles.revenueMetricValue, {
                color: stats?.lowStock > 0 ? '#FF9500' : '#30D158',
              }]}>
                {stats?.lowStock || 0}
              </Text>
              <Text style={styles.revenueMetricLabel}>Low Stock</Text>
            </View>
          </View>
        </View>
      </View>

      {/* ══ SECTION 3 — CONTENT ══ */}
      <View style={[styles.contentCard, { backgroundColor: c.background }]}>
        <Animated.View style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}>

          {/* ── STAT CARDS 2x2 ── */}
          <View style={styles.statsGrid}>
            {[
              {
                icon: '📦', label: 'Pending Orders',
                value: stats?.pending ?? 0, color: '#F2C94C', bg: '#2A1F00',
                onPress: can('view_orders') ? () => navigation.navigate('Orders') : null,
              },
              {
                icon: '🏷', label: 'Active Listings',
                value: stats?.totalListings ?? 0, color: '#30D158', bg: '#003A10',
                onPress: can('manage_listings') ? () => navigation.navigate('Products') : null,
              },
              {
                icon: '⚠️', label: 'Low Stock',
                value: stats?.lowStock ?? 0, color: '#FF9500', bg: '#2A1500',
                onPress: can('manage_listings') ? () => navigation.navigate('Products') : null,
              },
              {
                icon: '💰', label: 'Commission',
                value: '1%', color: '#BF5AF2', bg: '#1A0A2E',
                onPress: can('view_analytics') ? () => navigation.navigate('Analytics') : null,
              },
            ].map((s, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.statCard, { backgroundColor: s.bg }]}
                onPress={s.onPress}
                activeOpacity={s.onPress ? 0.8 : 1}
              >
                <Text style={styles.statIcon}>{s.icon}</Text>
                <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                <Text style={[styles.statLabel, { color: s.color, opacity: 0.7 }]}>
                  {s.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── QUICK ACTIONS ── */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: c.text }]}>Quick Actions</Text>
          </View>

          <View style={styles.actionsGrid}>
            {quickActions.map((a, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.actionCard, { backgroundColor: a.bg, borderColor: a.border }]}
                onPress={a.onPress}
                activeOpacity={0.8}
              >
                <Text style={styles.actionIcon}>{a.icon}</Text>
                <Text style={[styles.actionLabel, { color: a.color }]}>{a.label}</Text>
                {a.badge && (
                  <View style={[styles.actionBadge, { backgroundColor: '#F2C94C' }]}>
                    <Text style={styles.actionBadgeText}>{a.badge}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* ── PENDING ORDERS ── */}
          {can('view_orders') && (
            <>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionRow}>
                  <Text style={[styles.sectionTitle, { color: c.text }]}>Pending Orders</Text>
                  {recentOrders.length > 0 && (
                    <TouchableOpacity onPress={() => navigation.navigate('Orders')}>
                      <Text style={[styles.seeAll, { color: c.primary }]}>See all →</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {recentOrders.length > 0 ? recentOrders.map((order) => (
                <TouchableOpacity
                  key={order.sub_order_id}
                  style={[styles.orderCard, { backgroundColor: c.surface, shadowColor: c.text }]}
                  onPress={() => navigation.navigate('Orders')}
                  activeOpacity={0.8}
                >
                  <View style={[styles.orderBar, { backgroundColor: '#F2C94C' }]} />
                  <View style={styles.orderContent}>
                    <View style={styles.orderTop}>
                      <View style={styles.orderAvatar}>
                        <Text style={styles.orderAvatarText}>
                          {order.retailer_name?.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.orderInfo}>
                        <Text style={[styles.orderName, { color: c.text }]}>{order.retailer_name}</Text>
                        <Text style={[styles.orderAddress, { color: c.textMuted }]} numberOfLines={1}>
                          📍 {order.retailer_address}
                        </Text>
                      </View>
                      <View style={styles.orderAmountBox}>
                        <Text style={[styles.orderAmount, { color: c.primary }]}>
                          ₹{parseFloat(order.total_amount).toLocaleString('en-IN')}
                        </Text>
                        <View style={styles.pendingBadge}>
                          <Text style={styles.pendingText}>⏳ Pending</Text>
                        </View>
                      </View>
                    </View>

                    {order.items?.length > 0 && (
                      <View style={[styles.orderItems, { borderTopColor: c.borderLight }]}>
                        <Text style={[styles.orderItemsText, { color: c.textMuted }]}>
                          {order.items.slice(0, 2).map(it =>
                            `${it.generic_name} (${it.quantity})`
                          ).join(' · ')}
                          {order.items.length > 2 ? ` +${order.items.length - 2} more` : ''}
                        </Text>
                      </View>
                    )}

                    {can('accept_orders') && (
                      <View style={styles.orderActions}>
                        <TouchableOpacity
                          style={[styles.acceptBtn, { backgroundColor: c.primary }]}
                          onPress={async () => {
                            try {
                              await api.put(`/orders/${order.sub_order_id}/accept`);
                              loadDashboard();
                            } catch (e) {}
                          }}
                        >
                          <Text style={styles.acceptText}>✓ Accept</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.detailBtn, { backgroundColor: c.primaryLight }]}
                          onPress={() => navigation.navigate('Orders')}
                        >
                          <Text style={[styles.detailText, { color: c.primary }]}>
                            View Details →
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              )) : (
                <View style={[styles.emptyCard, { backgroundColor: c.surface }]}>
                  <Text style={styles.emptyEmoji}>🎉</Text>
                  <Text style={[styles.emptyTitle, { color: c.text }]}>All caught up!</Text>
                  <Text style={[styles.emptySub, { color: c.textMuted }]}>No pending orders right now</Text>
                </View>
              )}
            </>
          )}

          {/* ── MY LISTINGS ── */}
          {can('manage_listings') && listings.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: c.text }]}>My Listings</Text>
              </View>
              <View style={[styles.listingsCard, { backgroundColor: c.surface }]}>
                {listings.map((l, i) => (
                  <View
                    key={l.listing_id}
                    style={[styles.listingRow, {
                      borderBottomColor: c.borderLight,
                      borderBottomWidth: i < listings.length - 1 ? 0.5 : 0,
                    }]}
                  >
                    <View style={[styles.listingIcon, { backgroundColor: c.primaryLight }]}>
                      <Text style={styles.listingEmoji}>🏷</Text>
                    </View>
                    <View style={styles.listingInfo}>
                      <Text style={[styles.listingName, { color: c.text }]} numberOfLines={1}>
                        {l.brand_name} {l.generic_name}
                      </Text>
                      <View style={[styles.stockBar, { backgroundColor: c.borderLight }]}>
                        <View style={[styles.stockFill, {
                          width: `${Math.min(100, (l.stock_qty / 500) * 100)}%`,
                          backgroundColor: l.stock_qty < 10 ? '#FF9500' : c.primary,
                        }]} />
                      </View>
                      <Text style={[styles.stockText, {
                        color: l.stock_qty < 10 ? '#FF9500' : c.textMuted,
                      }]}>
                        {l.stock_qty < 10 ? '⚠️ ' : ''}Stock: {l.stock_qty} · MOQ: {l.min_order_qty}
                      </Text>
                    </View>
                    <View style={styles.listingPrice}>
                      <Text style={[styles.priceText, { color: c.primary }]}>₹{l.price}</Text>
                      {l.offer_price && (
                        <Text style={[styles.offerText, { color: c.success }]}>₹{l.offer_price}</Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* ── LOW STOCK ALERT ── */}
          {stats?.lowStock > 0 && (
            <View style={styles.alertCard}>
              <Text style={styles.alertIcon}>⚠️</Text>
              <View style={styles.alertBody}>
                <Text style={styles.alertTitle}>{stats.lowStock} products running low</Text>
                <Text style={styles.alertSub}>Update stock to avoid missing orders</Text>
              </View>
            </View>
          )}

          <View style={{ height: 32 }} />
        </Animated.View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 14 },

  brandSection: {
    backgroundColor: '#085041',
    paddingTop: 48, paddingHorizontal: 20, paddingBottom: 16,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  logoBox: { borderRadius: 14, overflow: 'hidden', elevation: 6 },
  brandText: { flex: 1 },
  brandName: { fontSize: 30, fontWeight: '800', letterSpacing: 0.5 },
  brandTagline: { fontSize: 9, color: 'rgba(255,255,255,0.55)', letterSpacing: 2, marginTop: 2 },
  notifBtn: { position: 'relative', padding: 8 },
  notifIcon: { fontSize: 22 },
  notifBadge: {
    position: 'absolute', top: 4, right: 4,
    backgroundColor: '#FF453A', borderRadius: 8,
    minWidth: 16, height: 16,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3,
  },
  notifCount: { color: '#fff', fontSize: 9, fontWeight: '700' },

  greetSection: {
    backgroundColor: '#0F6E56',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 28,
  },
  greetCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14, padding: 14, marginBottom: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  greeting: { fontSize: 19, fontWeight: '700', color: '#FFFFFF' },
  greetDate: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 3 },
  revenueCard: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 14, padding: 16,
    flexDirection: 'row', alignItems: 'center',
  },
  revenueLeft: { flex: 1 },
  revenueLabel: { fontSize: 9, color: 'rgba(255,255,255,0.5)', letterSpacing: 2, marginBottom: 4 },
  revenueValue: { fontSize: 34, fontWeight: '900', color: '#FFFFFF', letterSpacing: -1 },
  revenueSubLabel: { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 4 },
  revenueDivider: { width: 1, height: 56, backgroundColor: 'rgba(255,255,255,0.15)', marginHorizontal: 16 },
  revenueRight: { gap: 14 },
  revenueMetric: { alignItems: 'center' },
  revenueMetricValue: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  revenueMetricLabel: { fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 2 },

  contentCard: {
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    marginTop: -24, paddingTop: 24,
    elevation: 8, shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15, shadowRadius: 12,
    minHeight: 400,
  },

  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 12, gap: 10,
    marginBottom: 8, marginTop: 4,
  },
  statCard: { width: '47%', borderRadius: 16, padding: 16, alignItems: 'center', elevation: 1 },
  statIcon: { fontSize: 24, marginBottom: 8 },
  statValue: { fontSize: 22, fontWeight: '800', marginBottom: 3 },
  statLabel: { fontSize: 11, fontWeight: '600', textAlign: 'center' },

  sectionHeader: { paddingHorizontal: 16, marginTop: 20, marginBottom: 12 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  seeAll: { fontSize: 13, fontWeight: '600' },

  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 10 },
  actionCard: {
    width: '47%', borderRadius: 16, padding: 16,
    borderWidth: 1, position: 'relative',
    minHeight: 100, alignItems: 'center', justifyContent: 'center',
  },
  actionIcon: { fontSize: 32, marginBottom: 10, textAlign: 'center' },
  actionLabel: { fontSize: 13, fontWeight: '700', lineHeight: 18, textAlign: 'center' },
  actionBadge: { position: 'absolute', top: 8, right: 8, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  actionBadgeText: { fontSize: 11, fontWeight: '700', color: '#000' },

  orderCard: {
    marginHorizontal: 16, marginBottom: 12,
    borderRadius: 16, overflow: 'hidden',
    flexDirection: 'row', elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 6,
  },
  orderBar: { width: 4 },
  orderContent: { flex: 1, padding: 14 },
  orderTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  orderAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#0F6E56', justifyContent: 'center', alignItems: 'center' },
  orderAvatarText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  orderInfo: { flex: 1 },
  orderName: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  orderAddress: { fontSize: 11 },
  orderAmountBox: { alignItems: 'flex-end' },
  orderAmount: { fontSize: 15, fontWeight: '800', marginBottom: 4 },
  pendingBadge: { backgroundColor: '#2A1F00', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  pendingText: { color: '#F2C94C', fontSize: 10, fontWeight: '600' },
  orderItems: { borderTopWidth: 0.5, paddingTop: 8, marginBottom: 10 },
  orderItemsText: { fontSize: 11, lineHeight: 16 },
  orderActions: { flexDirection: 'row', gap: 8 },
  acceptBtn: { flex: 1, borderRadius: 10, paddingVertical: 8, alignItems: 'center' },
  acceptText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  detailBtn: { flex: 1, borderRadius: 10, paddingVertical: 8, alignItems: 'center' },
  detailText: { fontSize: 13, fontWeight: '600' },

  emptyCard: { marginHorizontal: 16, borderRadius: 16, padding: 32, alignItems: 'center', marginBottom: 16 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 6 },
  emptySub: { fontSize: 14 },

  listingsCard: { marginHorizontal: 16, borderRadius: 16, overflow: 'hidden', elevation: 1, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3 },
  listingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  listingIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  listingEmoji: { fontSize: 18 },
  listingInfo: { flex: 1 },
  listingName: { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  stockBar: { height: 3, borderRadius: 2, overflow: 'hidden', marginBottom: 3 },
  stockFill: { height: '100%', borderRadius: 2 },
  stockText: { fontSize: 10 },
  listingPrice: { alignItems: 'flex-end' },
  priceText: { fontSize: 14, fontWeight: '700' },
  offerText: { fontSize: 11, marginTop: 2 },

  alertCard: {
    marginHorizontal: 16, marginTop: 16,
    backgroundColor: '#2A1F00', borderRadius: 14,
    padding: 14, flexDirection: 'row',
    alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: '#BA7517',
  },
  alertIcon: { fontSize: 24 },
  alertBody: { flex: 1 },
  alertTitle: { fontSize: 13, fontWeight: '700', color: '#F2C94C' },
  alertSub: { fontSize: 11, color: '#854F0B', marginTop: 3 },
});