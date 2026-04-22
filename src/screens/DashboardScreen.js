import React, { useState, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
  Animated, Dimensions
} from 'react-native';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { usePermissions } from '../context/PermissionContext';
import VendorNetLogo from '../components/VendorNetLogo';

const { width: SCREEN_W } = Dimensions.get('window');

const STATUS_COLOR = {
  pending:          { color: '#F2C94C', bg: '#2A1F00' },
  accepted:         { color: '#1D9E75', bg: '#0A2E22' },
  packing:          { color: '#0A84FF', bg: '#001830' },
  dispatched:       { color: '#F2C94C', bg: '#2A1F00' },
  delivered:        { color: '#30D158', bg: '#003A10' },
  completed:        { color: '#30D158', bg: '#003A10' },
  invoice_uploaded: { color: '#30D158', bg: '#003A10' },
  rejected:         { color: '#FF453A', bg: '#2A0A0A' },
  auto_cancelled:   { color: '#FF9500', bg: '#2A1500' },
};

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

export default function DashboardScreen({ navigation }) {
  const [stats, setStats] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [listings, setListings] = useState([]);
  const [allOrders, setAllOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();
  const { theme } = useTheme();
  const { isAdmin, can } = usePermissions();
  const c = theme.colors;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    React.useCallback(() => { loadDashboard(); }, [])
  );

  const loadDashboard = async () => {
    try {
      const [pendingRes, listingsRes, allOrdersRes] = await Promise.all([
        api.get('/orders/pending'),
        api.get('/listings/my').catch(() => ({ data: { listings: [] } })),
        api.get('/orders/wholesaler/all?limit=100').catch(() => ({ data: { sub_orders: [] } })),
      ]);

      const pending = pendingRes.data.sub_orders || [];
      const allListings = listingsRes.data.listings || [];
      const allOrd = allOrdersRes.data.sub_orders || [];

      const activeListings = allListings.filter(l => l.is_active === true);
      const lowStock = activeListings.filter(l => l.stock_qty < 10).length;

      // Today's stats
      const today = new Date().toDateString();
      const todayOrders = allOrd.filter(o => new Date(o.created_at).toDateString() === today);
      const todayRevenue = todayOrders.filter(o => ['delivered','completed','invoice_uploaded'].includes(o.status))
        .reduce((s,o) => s + parseFloat(o.total_amount||0), 0);

      // This month
      const now = new Date();
      const monthOrders = allOrd.filter(o => {
        const d = new Date(o.created_at);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });
      const monthRevenue = monthOrders.filter(o => ['delivered','completed','invoice_uploaded'].includes(o.status))
        .reduce((s,o) => s + parseFloat(o.total_amount||0), 0);

      // Pending revenue
      const pendingRevenue = pending.reduce((s,o) => s + parseFloat(o.total_amount||0), 0);

      // Delivery rate
      const deliveredCount = allOrd.filter(o => ['delivered','completed','invoice_uploaded'].includes(o.status)).length;
      const deliveryRate = allOrd.length > 0 ? ((deliveredCount/allOrd.length)*100).toFixed(0) : 0;

      // Top retailers
      const retailerMap = allOrd.reduce((acc,o) => {
        const key = o.retailer_name||'Unknown';
        if (!acc[key]) acc[key] = { orders:0, amount:0 };
        acc[key].orders++;
        acc[key].amount += parseFloat(o.total_amount||0);
        return acc;
      }, {});
      const topRetailers = Object.entries(retailerMap)
        .sort((a,b) => b[1].amount - a[1].amount)
        .slice(0, 3)
        .map(([name, v]) => ({ name, ...v }));

      setStats({
        pending: pending.length,
        totalListings: activeListings.length,
        lowStock,
        pendingRevenue,
        todayOrders: todayOrders.length,
        todayRevenue,
        monthRevenue,
        totalOrders: allOrd.length,
        deliveryRate,
        topRetailers,
      });
      setRecentOrders(pending.slice(0, 5));
      setListings(activeListings.slice(0, 3));
      setAllOrders(allOrd);

      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  if (loading) return (
    <View style={[styles.loading, { backgroundColor: c.background }]}>
      <ActivityIndicator size="large" color={c.primary} />
      <Text style={[styles.loadingText, { color: c.textMuted }]}>Loading dashboard...</Text>
    </View>
  );

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  const formatAmount = (v) => v >= 100000 ? `${(v/100000).toFixed(1)}L` : v >= 1000 ? `${(v/1000).toFixed(1)}K` : v.toFixed(0);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: c.background }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadDashboard(); }} tintColor="#fff" colors={['#1D9E75']} />
      }>

      {/* ── HERO HEADER ── */}
      <View style={styles.hero}>
        {/* Top bar */}
        <View style={styles.heroTop}>
          <View style={styles.logoBox}><VendorNetLogo size={44} /></View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.greeting}>{getGreeting()}, {user?.name?.split(' ')[0] || 'there'} 👋</Text>
            <Text style={styles.greetDate}>{today}</Text>
          </View>
          <TouchableOpacity
            style={styles.notifBtn}
            onPress={() => can('view_orders') && navigation.navigate('Orders')}>
            <Text style={{ fontSize: 22 }}>🔔</Text>
            {stats?.pending > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifCount}>{stats.pending}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Revenue cards row */}
        <View style={styles.heroCards}>
          <View style={styles.heroCard}>
            <Text style={styles.heroCardLabel}>PENDING REVENUE</Text>
            <Text style={styles.heroCardValue}>₹{formatAmount(stats?.pendingRevenue||0)}</Text>
            <Text style={styles.heroCardSub}>{stats?.pending||0} orders</Text>
          </View>
          <View style={[styles.heroCard, styles.heroCardMiddle]}>
            <Text style={styles.heroCardLabel}>THIS MONTH</Text>
            <Text style={styles.heroCardValue}>₹{formatAmount(stats?.monthRevenue||0)}</Text>
            <Text style={styles.heroCardSub}>delivered</Text>
          </View>
          <View style={styles.heroCard}>
            <Text style={styles.heroCardLabel}>DELIVERY RATE</Text>
            <Text style={[styles.heroCardValue, { color: '#30D158' }]}>{stats?.deliveryRate||0}%</Text>
            <Text style={styles.heroCardSub}>{stats?.totalOrders||0} total</Text>
          </View>
        </View>
      </View>

      {/* ── CONTENT ── */}
      <View style={[styles.content, { backgroundColor: c.background }]}>
        <Animated.View style={{ opacity: fadeAnim }}>

          {/* TODAY'S SNAPSHOT */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: c.text }]}>📅 Today's Snapshot</Text>
          </View>
          <View style={styles.snapshotRow}>
            {[
              { label: 'New Orders', value: stats?.todayOrders||0, color: '#F2C94C', bg: '#2A1F00', icon: '📦' },
              { label: 'Revenue', value: `₹${formatAmount(stats?.todayRevenue||0)}`, color: '#30D158', bg: '#003A10', icon: '💰' },
              { label: 'Low Stock', value: stats?.lowStock||0, color: stats?.lowStock > 0 ? '#FF9500' : '#30D158', bg: stats?.lowStock > 0 ? '#2A1500' : '#003A10', icon: '⚠️' },
              { label: 'Listings', value: stats?.totalListings||0, color: '#0A84FF', bg: '#001830', icon: '🏷' },
            ].map((s,i) => (
              <TouchableOpacity key={i} style={[styles.snapCard, { backgroundColor: s.bg }]}
                onPress={() => s.label === 'Listings' ? navigation.navigate('Inventory') : s.label === 'Revenue' ? navigation.navigate('Analytics') : s.label === 'Low Stock' ? navigation.navigate('Inventory') : can('view_orders') && navigation.navigate('Orders')}>
                <Text style={{ fontSize: 18, marginBottom: 4 }}>{s.icon}</Text>
                <Text style={[styles.snapValue, { color: s.color }]}>{s.value}</Text>
                <Text style={[styles.snapLabel, { color: s.color, opacity: 0.75 }]}>{s.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ORDER STATUS PIPELINE */}
          {can('view_orders') && allOrders.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: c.text }]}>📊 Order Pipeline</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Orders')}>
                  <Text style={[styles.seeAll, { color: c.primary }]}>Manage →</Text>
                </TouchableOpacity>
              </View>
              <View style={[styles.pipelineCard, { backgroundColor: c.surface }]}>
                {[
                  { label: 'Pending', key: 'pending', color: '#F2C94C', icon: '⏳' },
                  { label: 'Accepted', key: 'accepted', color: '#1D9E75', icon: '✓' },
                  { label: 'Packing', key: 'packing', color: '#0A84FF', icon: '📦' },
                  { label: 'Dispatched', key: 'dispatched', color: '#F2C94C', icon: '🚚' },
                  { label: 'Delivered', key: 'delivered', color: '#30D158', icon: '✅' },
                ].map((stage, i, arr) => {
                  const count = allOrders.filter(o => o.status === stage.key ||
                    (stage.key === 'delivered' && ['delivered','completed','invoice_uploaded'].includes(o.status))
                  ).length;
                  const pct = allOrders.length > 0 ? Math.round((count/allOrders.length)*100) : 0;
                  return (
                    <View key={stage.key} style={styles.pipelineStage}>
                      <View style={[styles.pipelineIcon, { backgroundColor: count > 0 ? stage.color + '22' : c.surfaceSecondary||'#2C2C2E' }]}>
                        <Text style={{ fontSize: 16 }}>{stage.icon}</Text>
                      </View>
                      <Text style={[styles.pipelineCount, { color: count > 0 ? stage.color : c.textMuted }]}>{count}</Text>
                      <Text style={[styles.pipelineLabel, { color: c.textMuted }]}>{stage.label}</Text>
                      {i < arr.length-1 && <Text style={[styles.pipelineArrow, { color: c.borderLight }]}>→</Text>}
                    </View>
                  );
                })}
              </View>
            </>
          )}

          {/* 7-DAY REVENUE TREND */}
          {can('view_analytics') && allOrders.length > 0 && (
            <>
              <View style={[styles.sectionHeader, { marginTop: 16 }]}>
                <Text style={[styles.sectionTitle, { color: c.text }]}>📈 Last 7 Days</Text>
              </View>
              <View style={[styles.trendCard, { backgroundColor: c.surface }]}>
                {(() => {
                  const days = Array.from({ length: 7 }, (_, i) => {
                    const d = new Date();
                    d.setDate(d.getDate() - (6-i));
                    const key = d.toDateString();
                    const label = d.toLocaleDateString('en-IN', { weekday: 'short' });
                    const dayOrders = allOrders.filter(o => new Date(o.created_at).toDateString() === key);
                    const revenue = dayOrders.reduce((s,o) => s+parseFloat(o.total_amount||0),0);
                    return { label, count: dayOrders.length, revenue, isToday: i === 6 };
                  });
                  const maxRevenue = Math.max(...days.map(d => d.revenue), 1);
                  return (
                    <View style={styles.trendBars}>
                      {days.map((day, i) => (
                        <View key={i} style={styles.trendBarCol}>
                          {day.count > 0 && (
                            <Text style={[styles.trendCount, { color: day.isToday ? '#1D9E75' : c.textMuted }]}>
                              {day.count}
                            </Text>
                          )}
                          <View style={styles.trendBarWrapper}>
                            <View style={[styles.trendBar, {
                              height: day.revenue > 0 ? Math.max(8, (day.revenue/maxRevenue)*80) : 4,
                              backgroundColor: day.isToday ? '#1D9E75' : day.revenue > 0 ? c.primary : c.borderLight||'#3A3A3C',
                              opacity: day.isToday ? 1 : 0.7,
                            }]} />
                          </View>
                          <Text style={[styles.trendLabel, { color: day.isToday ? '#1D9E75' : c.textMuted, fontWeight: day.isToday ? '700' : '400' }]}>
                            {day.label}
                          </Text>
                        </View>
                      ))}
                    </View>
                  );
                })()}
              </View>
            </>
          )}

          {/* PENDING ORDERS */}
          {can('view_orders') && (
            <>
              <View style={[styles.sectionHeader, { marginTop: 20 }]}>
                <Text style={[styles.sectionTitle, { color: c.text }]}>⏳ Pending Orders</Text>
                {recentOrders.length > 0 && (
                  <TouchableOpacity onPress={() => navigation.navigate('Orders')}>
                    <Text style={[styles.seeAll, { color: c.primary }]}>See all →</Text>
                  </TouchableOpacity>
                )}
              </View>

              {recentOrders.length > 0 ? recentOrders.map(order => (
                <TouchableOpacity
                  key={order.sub_order_id}
                  style={[styles.orderCard, { backgroundColor: c.surface }]}
                  onPress={() => navigation.navigate('Orders')}
                  activeOpacity={0.8}>
                  <View style={styles.orderLeft}>
                    <View style={[styles.orderAvatar, { backgroundColor: '#0F6E56' }]}>
                      <Text style={styles.orderAvatarText}>{order.retailer_name?.charAt(0).toUpperCase()}</Text>
                    </View>
                  </View>
                  <View style={styles.orderMid}>
                    <Text style={[styles.orderName, { color: c.text }]}>{order.retailer_name}</Text>
                    <Text style={[styles.orderAddress, { color: c.textMuted }]} numberOfLines={1}>
                      📍 {order.retailer_address || 'Address not provided'}
                    </Text>
                    {order.items?.length > 0 && (
                      <Text style={[styles.orderItems, { color: c.textMuted }]} numberOfLines={1}>
                        {order.items.slice(0,2).map(i => `${i.generic_name} ×${i.quantity}`).join(' · ')}
                        {order.items.length > 2 ? ` +${order.items.length-2}` : ''}
                      </Text>
                    )}
                  </View>
                  <View style={styles.orderRight}>
                    <Text style={[styles.orderAmount, { color: c.primary }]}>₹{parseFloat(order.total_amount).toLocaleString('en-IN')}</Text>
                    <View style={[styles.pendingBadge]}>
                      <Text style={styles.pendingText}>⏳ Pending</Text>
                    </View>
                    {can('accept_orders') && (
                      <TouchableOpacity
                        style={[styles.acceptBtn, { backgroundColor: '#1D9E75' }]}
                        onPress={async (e) => {
                          e.stopPropagation();
                          try { await api.put(`/orders/${order.sub_order_id}/accept`); loadDashboard(); } catch {}
                        }}>
                        <Text style={styles.acceptText}>✓ Accept</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </TouchableOpacity>
              )) : (
                <View style={[styles.emptyCard, { backgroundColor: c.surface }]}>
                  <Text style={{ fontSize: 40, marginBottom: 8 }}>🎉</Text>
                  <Text style={[styles.emptyTitle, { color: c.text }]}>All caught up!</Text>
                  <Text style={[{ fontSize: 13, color: c.textMuted }]}>No pending orders right now</Text>
                </View>
              )}
            </>
          )}

          {/* TOP RETAILERS */}
          {stats?.topRetailers?.length > 0 && isAdmin && (
            <>
              <View style={[styles.sectionHeader, { marginTop: 20 }]}>
                <Text style={[styles.sectionTitle, { color: c.text }]}>🏆 Top Retailers</Text>
              </View>
              <View style={[styles.retailersCard, { backgroundColor: c.surface }]}>
                {stats.topRetailers.map((r, i) => (
                  <View key={i} style={[styles.retailerRow, { borderBottomColor: c.borderLight, borderBottomWidth: i < stats.topRetailers.length-1 ? 0.5 : 0 }]}>
                    <View style={[styles.rankBadge, { backgroundColor: i === 0 ? '#F2C94C' : i === 1 ? '#C0C0C0' : '#CD7F32' }]}>
                      <Text style={styles.rankText}>#{i+1}</Text>
                    </View>
                    <Text style={[styles.retailerName, { color: c.text }]} numberOfLines={1}>{r.name}</Text>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.retailerAmount, { color: c.primary }]}>₹{formatAmount(r.amount)}</Text>
                      <Text style={[styles.retailerOrders, { color: c.textMuted }]}>{r.orders} orders</Text>
                    </View>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* MY LISTINGS */}
          {can('manage_listings') && listings.length > 0 && (
            <>
              <View style={[styles.sectionHeader, { marginTop: 20 }]}>
                <Text style={[styles.sectionTitle, { color: c.text }]}>🏷 My Listings</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Inventory')}>
                  <Text style={[styles.seeAll, { color: c.primary }]}>See all →</Text>
                </TouchableOpacity>
              </View>
              <View style={[styles.listingsCard, { backgroundColor: c.surface }]}>
                {listings.map((l, i) => (
                  <View key={l.listing_id} style={[styles.listingRow, { borderBottomColor: c.borderLight, borderBottomWidth: i < listings.length-1 ? 0.5 : 0 }]}>
                    <View style={[styles.listingIcon, { backgroundColor: c.primaryLight }]}>
                      <Text style={{ fontSize: 18 }}>🏷</Text>
                    </View>
                    <View style={styles.listingInfo}>
                      <Text style={[styles.listingName, { color: c.text }]} numberOfLines={1}>{l.brand_name} {l.generic_name}</Text>
                      <View style={[styles.stockBar, { backgroundColor: c.borderLight }]}>
                        <View style={[styles.stockFill, { width: `${Math.min(100,(l.stock_qty/500)*100)}%`, backgroundColor: l.stock_qty < 10 ? '#FF9500' : c.primary }]} />
                      </View>
                      <Text style={[styles.stockText, { color: l.stock_qty < 10 ? '#FF9500' : c.textMuted }]}>
                        {l.stock_qty < 10 ? '⚠️ ' : ''}Stock: {l.stock_qty} · MOQ: {l.min_order_qty}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.priceText, { color: c.primary }]}>₹{l.price}</Text>
                      {l.offer_price && <Text style={[styles.offerText, { color: '#1D9E75' }]}>₹{l.offer_price}</Text>}
                    </View>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* LOW STOCK ALERT */}
          {stats?.lowStock > 0 && (
            <TouchableOpacity
              style={styles.alertCard}
              onPress={() => navigation.navigate('Inventory')}>
              <Text style={{ fontSize: 24 }}>⚠️</Text>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.alertTitle}>{stats.lowStock} product{stats.lowStock > 1 ? 's' : ''} running low</Text>
                <Text style={styles.alertSub}>Tap to update stock → avoid missing orders</Text>
              </View>
              <Text style={{ color: '#FF9500', fontSize: 18 }}>→</Text>
            </TouchableOpacity>
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

  hero: { backgroundColor: '#085041', paddingTop: 48, paddingBottom: 24, paddingHorizontal: 16 },
  heroTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  logoBox: { borderRadius: 12, overflow: 'hidden' },
  greeting: { fontSize: 16, fontWeight: '700', color: '#fff' },
  greetDate: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  notifBtn: { padding: 6, position: 'relative' },
  notifBadge: { position: 'absolute', top: 2, right: 2, backgroundColor: '#FF453A', borderRadius: 8, minWidth: 16, height: 16, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3 },
  notifCount: { color: '#fff', fontSize: 9, fontWeight: '700' },

  heroCards: { flexDirection: 'row', gap: 8 },
  heroCard: { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 12, padding: 12, alignItems: 'center' },
  heroCardMiddle: { backgroundColor: 'rgba(255,255,255,0.1)' },
  heroCardLabel: { fontSize: 8, color: 'rgba(255,255,255,0.5)', letterSpacing: 1, marginBottom: 4, textAlign: 'center' },
  heroCardValue: { fontSize: 18, fontWeight: '900', color: '#fff', marginBottom: 2 },
  heroCardSub: { fontSize: 9, color: 'rgba(255,255,255,0.5)' },

  content: { borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: -16, paddingTop: 20, minHeight: 400 },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '700' },
  seeAll: { fontSize: 12, fontWeight: '600' },

  snapshotRow: { flexDirection: 'row', paddingHorizontal: 12, gap: 8, marginBottom: 4 },
  snapCard: { flex: 1, borderRadius: 12, padding: 10, alignItems: 'center' },
  snapValue: { fontSize: 16, fontWeight: '800', marginBottom: 2 },
  snapLabel: { fontSize: 9, fontWeight: '600', textAlign: 'center' },



  orderCard: { marginHorizontal: 12, marginBottom: 8, borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 10, elevation: 1, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3 },
  orderLeft: {},
  orderAvatar: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  orderAvatarText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  orderMid: { flex: 1 },
  orderName: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  orderAddress: { fontSize: 10, marginBottom: 3 },
  orderItems: { fontSize: 10, lineHeight: 14 },
  orderRight: { alignItems: 'flex-end', gap: 4 },
  orderAmount: { fontSize: 14, fontWeight: '800' },
  pendingBadge: { backgroundColor: '#2A1F00', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  pendingText: { color: '#F2C94C', fontSize: 9, fontWeight: '600' },
  acceptBtn: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  acceptText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  emptyCard: { marginHorizontal: 12, borderRadius: 14, padding: 28, alignItems: 'center', marginBottom: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },

  retailersCard: { marginHorizontal: 12, borderRadius: 14, overflow: 'hidden', elevation: 1, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3 },
  retailerRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  rankBadge: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  rankText: { fontSize: 10, fontWeight: '800', color: '#000' },
  retailerName: { flex: 1, fontSize: 13, fontWeight: '600' },
  retailerAmount: { fontSize: 14, fontWeight: '700' },
  retailerOrders: { fontSize: 10, marginTop: 1 },

  listingsCard: { marginHorizontal: 12, borderRadius: 14, overflow: 'hidden', elevation: 1, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3 },
  listingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  listingIcon: { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  listingInfo: { flex: 1 },
  listingName: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  stockBar: { height: 3, borderRadius: 2, overflow: 'hidden', marginBottom: 3 },
  stockFill: { height: '100%', borderRadius: 2 },
  stockText: { fontSize: 9 },
  priceText: { fontSize: 13, fontWeight: '700' },
  offerText: { fontSize: 10, marginTop: 1 },

  pipelineCard: { marginHorizontal: 12, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'flex-start', elevation: 1, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3 },
  pipelineStage: { flex: 1, alignItems: 'center', position: 'relative' },
  pipelineIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  pipelineCount: { fontSize: 16, fontWeight: '800', marginBottom: 2 },
  pipelineLabel: { fontSize: 9, fontWeight: '600', textAlign: 'center' },
  pipelineArrow: { position: 'absolute', right: -4, top: 10, fontSize: 12 },
  trendCard: { marginHorizontal: 12, borderRadius: 14, padding: 14, elevation: 1, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3 },
  trendBars: { flexDirection: 'row', alignItems: 'flex-end', height: 110 },
  trendBarCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' },
  trendCount: { fontSize: 9, marginBottom: 2 },
  trendBarWrapper: { width: '60%', alignItems: 'center', justifyContent: 'flex-end', flex: 1 },
  trendBar: { width: '100%', borderRadius: 4 },
  trendLabel: { fontSize: 9, marginTop: 4 },
  alertCard: { marginHorizontal: 12, marginTop: 16, backgroundColor: '#2A1F00', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#BA7517' },
  alertTitle: { fontSize: 13, fontWeight: '700', color: '#F2C94C', marginBottom: 2 },
  alertSub: { fontSize: 10, color: '#9A6010' },
});

