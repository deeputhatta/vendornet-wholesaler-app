import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
  Animated, Dimensions
} from 'react-native';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const FINANCIAL_YEARS = ['2023-24', '2024-25', '2025-26', '2026-27'];
const MONTHS = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
const MONTH_NUMS = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3];
const CATEGORY_COLORS = ['#185FA5', '#1D9E75', '#F2C94C', '#FF453A', '#BF5AF2'];

const STATUS_CONFIG = {
  pending:            { label: 'Pending',    color: '#F2C94C', bg: '#2A1F00' },
  accepted:           { label: 'Accepted',   color: '#1D9E75', bg: '#0A2E22' },
  partially_accepted: { label: 'Partial',    color: '#185FA5', bg: '#0A1F35' },
  packing:            { label: 'Packing',    color: '#0A84FF', bg: '#001830' },
  dispatched:         { label: 'Dispatched', color: '#0A84FF', bg: '#001830' },
  delivered:          { label: 'Delivered',  color: '#30D158', bg: '#003A10' },
  completed:          { label: 'Completed',  color: '#30D158', bg: '#003A10' },
  invoice_uploaded:   { label: 'Invoiced',   color: '#30D158', bg: '#003A10' },
  rejected:           { label: 'Rejected',   color: '#FF453A', bg: '#2A0A0A' },
  auto_cancelled:     { label: 'Cancelled',  color: '#FF9500', bg: '#2A1500' },
};

// Animated bar component
function AnimatedBar({ heightPct, color, delay = 0 }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: heightPct,
      duration: 800,
      delay,
      useNativeDriver: false,
    }).start();
  }, [heightPct]);
  return (
    <Animated.View style={{
      width: '100%',
      height: anim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
      backgroundColor: color,
      borderRadius: 4,
    }} />
  );
}

// Animated progress bar
function AnimatedProgress({ pct, color, delay = 0 }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: pct,
      duration: 1000,
      delay,
      useNativeDriver: false,
    }).start();
  }, [pct]);
  return (
    <Animated.View style={{
      height: '100%',
      width: anim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
      backgroundColor: color,
      borderRadius: 3,
    }} />
  );
}

export default function AnalyticsScreen({ navigation }) {
  const [analytics, setAnalytics] = useState(null);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFY, setSelectedFY] = useState(() => {
    const now = new Date();
    const startYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    return `${startYear}-${String(startYear + 1).slice(2)}`;
  });
  const { theme } = useTheme();
  const c = theme.colors;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => { loadData(); }, [selectedFY]);

  const loadData = async () => {
    fadeAnim.setValue(0);
    try {
      const [analyticsRes, listingsRes] = await Promise.all([
        api.get(`/orders/analytics?fy=${selectedFY}`),
        api.get('/listings/my'),
      ]);
      setAnalytics(analyticsRes.data);
      setListings(listingsRes.data.listings || []);
      Animated.timing(fadeAnim, {
        toValue: 1, duration: 600, useNativeDriver: true,
      }).start();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getMonthlyData = () => {
    if (!analytics?.monthly_revenue) return MONTHS.map(() => 0);
    return MONTH_NUMS.map(m => {
      const found = analytics.monthly_revenue.find(r => parseInt(r.month) === m);
      return found ? parseFloat(found.revenue) : 0;
    });
  };

  const getCategoryData = () => {
    const map = {};
    listings.forEach(l => {
      const cat = l.category_name || 'Others';
      map[cat] = (map[cat] || 0) + 1;
    });
    const total = listings.length || 1;
    return Object.entries(map)
      .map(([name, count]) => ({ name, count, pct: Math.round((count / total) * 100) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  };

  if (loading) return (
    <View style={[styles.loading, { backgroundColor: c.background }]}>
      <ActivityIndicator size="large" color={c.primary} />
      <Text style={[styles.loadingText, { color: c.textMuted }]}>Loading analytics...</Text>
    </View>
  );

  const summary = analytics?.summary || {};
  const topItems = analytics?.top_items || [];
  const topRetailers = analytics?.top_retailers || [];
  const statusBreakdown = analytics?.status_breakdown || [];
  const categoryData = getCategoryData();
  const monthlyData = getMonthlyData();
  const maxRevenue = Math.max(...monthlyData, 1);
  const lowStock = listings.filter(l => l.stock_qty < 10).length;
  const totalRevenue = summary.total_revenue || 0;
  const avgOrderValue = summary.total_orders > 0
    ? totalRevenue / summary.total_orders : 0;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: c.background }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); loadData(); }}
          tintColor={c.primary} colors={[c.primary]}
        />
      }
    >
      {/* ── HERO HEADER ── */}
      <View style={[styles.hero, { backgroundColor: c.primary }]}>
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.heroTitle}>Analytics</Text>
            <Text style={styles.heroSub}>Business performance</Text>
          </View>
          <View style={[styles.heroBadge, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
            <Text style={styles.heroBadgeText}>FY {selectedFY}</Text>
          </View>
        </View>

        {/* Big revenue number */}
        <View style={styles.heroRevenue}>
          <Text style={styles.heroRevenueLabel}>Total Revenue</Text>
          <Text style={styles.heroRevenueValue}>
            ₹{totalRevenue >= 100000
              ? `${(totalRevenue / 100000).toFixed(2)}L`
              : totalRevenue >= 1000
              ? `${(totalRevenue / 1000).toFixed(1)}K`
              : totalRevenue.toFixed(0)}
          </Text>
          <View style={styles.heroMetaRow}>
            <View style={styles.heroMeta}>
              <Text style={styles.heroMetaValue}>{summary.total_orders ?? 0}</Text>
              <Text style={styles.heroMetaLabel}>Orders</Text>
            </View>
            <View style={[styles.heroMetaDivider, { backgroundColor: 'rgba(255,255,255,0.2)' }]} />
            <View style={styles.heroMeta}>
              <Text style={styles.heroMetaValue}>
                ₹{avgOrderValue >= 1000
                  ? `${(avgOrderValue / 1000).toFixed(1)}K`
                  : avgOrderValue.toFixed(0)}
              </Text>
              <Text style={styles.heroMetaLabel}>Avg Order</Text>
            </View>
            <View style={[styles.heroMetaDivider, { backgroundColor: 'rgba(255,255,255,0.2)' }]} />
            <View style={styles.heroMeta}>
              <Text style={styles.heroMetaValue}>{listings.length}</Text>
              <Text style={styles.heroMetaLabel}>Listings</Text>
            </View>
          </View>
        </View>
      </View>

      {/* ── FY SELECTOR ── */}
      <View style={[styles.fyContainer, { backgroundColor: c.surface, borderBottomColor: c.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.fyRow}>
            {FINANCIAL_YEARS.map(fy => (
              <TouchableOpacity
                key={fy}
                style={[styles.fyBtn, {
                  backgroundColor: selectedFY === fy ? c.primary : c.surfaceSecondary,
                  borderColor: selectedFY === fy ? c.primary : c.border,
                }]}
                onPress={() => { setSelectedFY(fy); setLoading(true); }}
              >
                <Text style={[styles.fyBtnText, {
                  color: selectedFY === fy ? '#FFFFFF' : c.textMuted,
                  fontWeight: selectedFY === fy ? '700' : '400',
                }]}>
                  FY {fy}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>

        {/* ── QUICK STATS ROW ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickStatsScroll}>
          <View style={styles.quickStatsRow}>
            {[
              { icon: '📦', label: 'Pending', value: listings.filter ? '—' : 0, color: '#F2C94C', bg: '#2A1F00' },
              { icon: '🏷', label: 'Active', value: listings.length, color: c.success, bg: '#0A2E22' },
              { icon: '⚠️', label: 'Low Stock', value: lowStock, color: '#FF9500', bg: '#2A1500' },
              { icon: '💰', label: 'Commission', value: '1%', color: c.error, bg: '#2A0A0A' },
            ].map((s, i) => (
              <View key={i} style={[styles.quickCard, { backgroundColor: s.bg }]}>
                <Text style={styles.quickIcon}>{s.icon}</Text>
                <Text style={[styles.quickValue, { color: s.color }]}>{s.value}</Text>
                <Text style={[styles.quickLabel, { color: s.color, opacity: 0.7 }]}>{s.label}</Text>
              </View>
            ))}
          </View>
        </ScrollView>

        {/* ── REVENUE CHART ── */}
        <View style={[styles.card, { backgroundColor: c.surface }]}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={[styles.cardTitle, { color: c.text }]}>Monthly Revenue</Text>
              <Text style={[styles.cardSub, { color: c.textMuted }]}>FY {selectedFY}</Text>
            </View>
            <View style={[styles.chartLegend, { backgroundColor: c.surfaceSecondary }]}>
              <View style={[styles.legendDot, { backgroundColor: c.accent }]} />
              <Text style={[styles.legendText, { color: c.textMuted }]}>Current month</Text>
            </View>
          </View>
          <View style={styles.chart}>
            {MONTHS.map((month, i) => {
              const val = monthlyData[i];
              const heightPct = maxRevenue > 0 ? (val / maxRevenue) * 100 : 0;
              const now = new Date();
              const isCurrentMonth = now.getMonth() + 1 === MONTH_NUMS[i];
              const barColor = isCurrentMonth ? c.accent
                : val > 0 ? c.primary : c.borderLight;
              return (
                <View key={month} style={styles.barCol}>
                  {val > 0 && (
                    <Text style={[styles.barValue, { color: isCurrentMonth ? c.accent : c.textMuted }]}>
                      {val >= 1000 ? `${(val / 1000).toFixed(0)}K` : val}
                    </Text>
                  )}
                  <View style={styles.barWrapper}>
                    <AnimatedBar
                      heightPct={Math.max(heightPct, val > 0 ? 4 : 0)}
                      color={barColor}
                      delay={i * 50}
                    />
                  </View>
                  <Text style={[styles.barLabel, {
                    color: isCurrentMonth ? c.accent : c.textMuted,
                    fontWeight: isCurrentMonth ? '700' : '400',
                  }]}>
                    {month}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* ── TOP ORDERED ITEMS ── */}
        <View style={[styles.card, { backgroundColor: c.surface }]}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={[styles.cardTitle, { color: c.text }]}>🔥 Top Ordered Items</Text>
              <Text style={[styles.cardSub, { color: c.textMuted }]}>By quantity ordered</Text>
            </View>
          </View>
          {topItems.length > 0 ? topItems.map((item, i) => {
            const maxQty = parseInt(topItems[0].total_qty || 1);
            const pct = Math.round((parseInt(item.total_qty || 0) / maxQty) * 100);
            const medals = ['🥇', '🥈', '🥉'];
            return (
              <View key={i} style={[styles.itemRow, {
                borderBottomColor: c.borderLight,
                borderBottomWidth: i < topItems.length - 1 ? 0.5 : 0,
              }]}>
                <Text style={styles.medal}>{medals[i] || `#${i + 1}`}</Text>
                <View style={styles.itemInfo}>
                  <Text style={[styles.itemName, { color: c.text }]} numberOfLines={1}>
                    {item.generic_name}
                  </Text>
                  <Text style={[styles.itemBrand, { color: c.primary }]}>
                    {item.brand_name}
                  </Text>
                  <View style={[styles.progressTrack, { backgroundColor: c.borderLight }]}>
                    <AnimatedProgress
                      pct={pct}
                      color={i === 0 ? c.accent : c.primary}
                      delay={i * 100}
                    />
                  </View>
                </View>
                <View style={styles.itemStats}>
                  <Text style={[styles.itemQty, { color: i === 0 ? c.accent : c.text }]}>
                    {parseInt(item.total_qty || 0)}
                  </Text>
                  <Text style={[styles.itemUnit, { color: c.textMuted }]}>units</Text>
                  <Text style={[styles.itemRevenue, { color: c.success }]}>
                    ₹{(parseFloat(item.total_revenue || 0) / 1000).toFixed(1)}K
                  </Text>
                </View>
              </View>
            );
          }) : (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyEmoji}>📦</Text>
              <Text style={[styles.emptyText, { color: c.textMuted }]}>No orders in FY {selectedFY}</Text>
            </View>
          )}
        </View>

        {/* ── TOP RETAILERS ── */}
        <View style={[styles.card, { backgroundColor: c.surface }]}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={[styles.cardTitle, { color: c.text }]}>👥 Top Retailers</Text>
              <Text style={[styles.cardSub, { color: c.textMuted }]}>By total spend</Text>
            </View>
          </View>
          {topRetailers.length > 0 ? topRetailers.map((retailer, i) => {
            const maxSpend = parseFloat(topRetailers[0].total_spent || 1);
            const pct = Math.round((parseFloat(retailer.total_spent || 0) / maxSpend) * 100);
            return (
              <View key={i} style={[styles.itemRow, {
                borderBottomColor: c.borderLight,
                borderBottomWidth: i < topRetailers.length - 1 ? 0.5 : 0,
              }]}>
                <View style={[styles.avatarCircle, {
                  backgroundColor: i === 0 ? c.primary : c.surfaceSecondary,
                }]}>
                  <Text style={[styles.avatarText, {
                    color: i === 0 ? '#FFFFFF' : c.textMuted,
                  }]}>
                    {retailer.retailer_name?.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.itemInfo}>
                  <Text style={[styles.itemName, { color: c.text }]}>
                    {retailer.retailer_name}
                  </Text>
                  <Text style={[styles.itemBrand, { color: c.textMuted }]}>
                    +91 {retailer.mobile} · {retailer.order_count} orders
                  </Text>
                  <View style={[styles.progressTrack, { backgroundColor: c.borderLight }]}>
                    <AnimatedProgress
                      pct={pct}
                      color={i === 0 ? c.success : c.primary}
                      delay={i * 100}
                    />
                  </View>
                </View>
                <View style={styles.itemStats}>
                  <Text style={[styles.itemQty, { color: i === 0 ? c.success : c.text }]}>
                    ₹{(parseFloat(retailer.total_spent || 0) / 1000).toFixed(1)}K
                  </Text>
                  <Text style={[styles.itemUnit, { color: c.textMuted }]}>spent</Text>
                </View>
              </View>
            );
          }) : (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyEmoji}>👥</Text>
              <Text style={[styles.emptyText, { color: c.textMuted }]}>No retailers in FY {selectedFY}</Text>
            </View>
          )}
        </View>

        {/* ── ORDER STATUS ── */}
        <View style={[styles.card, { backgroundColor: c.surface }]}>
          <Text style={[styles.cardTitle, { color: c.text }]}>Order Status Breakdown</Text>
          <Text style={[styles.cardSub, { color: c.textMuted, marginBottom: 14 }]}>
            All orders in FY {selectedFY}
          </Text>
          {statusBreakdown.length > 0 ? (
            <View style={styles.statusGrid}>
              {statusBreakdown.map((s, i) => {
                const config = STATUS_CONFIG[s.status] || { label: s.status, color: c.textMuted, bg: c.surfaceSecondary };
                return (
                  <View key={i} style={[styles.statusCard, { backgroundColor: config.bg }]}>
                    <Text style={[styles.statusCount, { color: config.color }]}>{s.count}</Text>
                    <Text style={[styles.statusLabel, { color: config.color, opacity: 0.8 }]}>
                      {config.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyEmoji}>📋</Text>
              <Text style={[styles.emptyText, { color: c.textMuted }]}>No orders in FY {selectedFY}</Text>
            </View>
          )}
        </View>

        {/* ── CATEGORY BREAKDOWN ── */}
        <View style={[styles.card, { backgroundColor: c.surface }]}>
          <Text style={[styles.cardTitle, { color: c.text }]}>Listings by Category</Text>
          <Text style={[styles.cardSub, { color: c.textMuted, marginBottom: 14 }]}>
            {listings.length} total listings
          </Text>
          {categoryData.length > 0 ? categoryData.map((cat, i) => (
            <View key={cat.name} style={styles.catRow}>
              <View style={styles.catLeft}>
                <View style={[styles.catDot, {
                  backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
                }]} />
                <Text style={[styles.catName, { color: c.textSecondary }]} numberOfLines={1}>
                  {cat.name}
                </Text>
                <Text style={[styles.catCount, { color: c.textMuted }]}>({cat.count})</Text>
              </View>
              <View style={styles.catRight}>
                <View style={[styles.catTrack, { backgroundColor: c.borderLight }]}>
                  <AnimatedProgress
                    pct={cat.pct}
                    color={CATEGORY_COLORS[i % CATEGORY_COLORS.length]}
                    delay={i * 100}
                  />
                </View>
                <Text style={[styles.catPct, {
                  color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
                }]}>
                  {cat.pct}%
                </Text>
              </View>
            </View>
          )) : (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyEmoji}>🏷</Text>
              <Text style={[styles.emptyText, { color: c.textMuted }]}>No listings yet</Text>
            </View>
          )}
        </View>

        {/* ── LOW STOCK WARNING ── */}
        {lowStock > 0 && (
          <View style={[styles.warningCard, { backgroundColor: '#2A1F00', borderColor: '#BA7517' }]}>
            <Text style={styles.warningIcon}>⚠️</Text>
            <View style={styles.warningBody}>
              <Text style={[styles.warningTitle, { color: '#F2C94C' }]}>
                {lowStock} products running low
              </Text>
              <Text style={[styles.warningSub, { color: '#854F0B' }]}>
                Update stock to avoid missing orders
              </Text>
            </View>
          </View>
        )}

        <View style={{ height: 32 }} />
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 14 },

  // Hero
  hero: { paddingTop: 48, paddingHorizontal: 20, paddingBottom: 24 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  heroTitle: { fontSize: 24, fontWeight: '800', color: '#FFFFFF' },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  heroBadge: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  heroBadgeText: { fontSize: 12, fontWeight: '600', color: '#FFFFFF' },
  heroRevenue: { alignItems: 'flex-start' },
  heroRevenueLabel: { fontSize: 12, color: 'rgba(255,255,255,0.6)', letterSpacing: 1, marginBottom: 4 },
  heroRevenueValue: { fontSize: 48, fontWeight: '900', color: '#FFFFFF', letterSpacing: -1, marginBottom: 16 },
  heroMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  heroMeta: { alignItems: 'center' },
  heroMetaValue: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  heroMetaLabel: { fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  heroMetaDivider: { width: 1, height: 28 },

  // FY
  fyContainer: { paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1 },
  fyRow: { flexDirection: 'row', gap: 8, paddingRight: 8 },
  fyBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  fyBtnText: { fontSize: 13 },

  content: { padding: 16 },

  // Quick stats
  quickStatsScroll: { marginBottom: 16, marginHorizontal: -16, paddingHorizontal: 16 },
  quickStatsRow: { flexDirection: 'row', gap: 10, paddingRight: 16 },
  quickCard: {
    borderRadius: 14, padding: 14, alignItems: 'center',
    minWidth: 80, elevation: 1,
  },
  quickIcon: { fontSize: 20, marginBottom: 6 },
  quickValue: { fontSize: 18, fontWeight: '800', marginBottom: 2 },
  quickLabel: { fontSize: 10, fontWeight: '600' },

  // Card
  card: {
    borderRadius: 16, padding: 16, marginBottom: 16,
    elevation: 1, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 16,
  },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  cardSub: { fontSize: 12, marginTop: 2 },
  chartLegend: {
    flexDirection: 'row', alignItems: 'center',
    gap: 6, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
  },
  legendDot: { width: 6, height: 6, borderRadius: 3 },
  legendText: { fontSize: 10 },

  // Chart
  chart: { flexDirection: 'row', alignItems: 'flex-end', height: 130, gap: 3 },
  barCol: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
  barValue: { fontSize: 7, marginBottom: 2, textAlign: 'center' },
  barWrapper: { flex: 1, width: '100%', justifyContent: 'flex-end' },
  barLabel: { fontSize: 8, marginTop: 4, textAlign: 'center' },

  // Item rows
  itemRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, gap: 12,
  },
  medal: { fontSize: 20, width: 28, textAlign: 'center' },
  avatarCircle: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: 15, fontWeight: '700' },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  itemBrand: { fontSize: 11, marginBottom: 6 },
  progressTrack: { height: 4, borderRadius: 2, overflow: 'hidden' },
  itemStats: { alignItems: 'flex-end', minWidth: 60 },
  itemQty: { fontSize: 16, fontWeight: '800' },
  itemUnit: { fontSize: 10, marginTop: 1 },
  itemRevenue: { fontSize: 11, fontWeight: '600', marginTop: 2 },

  // Status
  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusCard: {
    borderRadius: 12, padding: 12,
    alignItems: 'center', minWidth: 80, flex: 1,
  },
  statusCount: { fontSize: 22, fontWeight: '900', marginBottom: 3 },
  statusLabel: { fontSize: 10, fontWeight: '600', textAlign: 'center' },

  // Category
  catRow: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: 12, gap: 10,
  },
  catLeft: {
    flexDirection: 'row', alignItems: 'center',
    width: 110, gap: 6,
  },
  catDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  catName: { fontSize: 12, flex: 1 },
  catCount: { fontSize: 10 },
  catRight: {
    flex: 1, flexDirection: 'row',
    alignItems: 'center', gap: 8,
  },
  catTrack: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  catPct: { fontSize: 12, fontWeight: '700', width: 34, textAlign: 'right' },

  // Warning
  warningCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 14, padding: 16, gap: 12, borderWidth: 1,
  },
  warningIcon: { fontSize: 28 },
  warningBody: { flex: 1 },
  warningTitle: { fontSize: 14, fontWeight: '700' },
  warningSub: { fontSize: 12, marginTop: 3 },

  emptyBox: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  emptyEmoji: { fontSize: 36 },
  emptyText: { fontSize: 13 },
});