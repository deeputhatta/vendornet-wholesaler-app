import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
  TouchableOpacity, RefreshControl, Dimensions
} from 'react-native';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { useFocusEffect } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const STATUS_LABELS = {
  pending: 'Pending', accepted: 'Accepted', packing: 'Packing',
  dispatched: 'Dispatched', delivered: 'Delivered', completed: 'Completed',
  invoice_uploaded: 'Invoiced', rejected: 'Rejected', auto_cancelled: 'Cancelled',
};
const STATUS_COLORS = {
  pending: '#FF9500', accepted: '#30D158', packing: '#0A84FF',
  dispatched: '#F2C94C', delivered: '#30D158', completed: '#30D158',
  invoice_uploaded: '#30D158', rejected: '#FF453A', auto_cancelled: '#FF453A',
};

export default function AnalyticsScreen({ navigation }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { theme } = useTheme();
  const c = theme.colors;

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const loadData = async () => {
    try {
      const [ordersRes, listingsRes] = await Promise.all([
        api.get('/orders/wholesaler/all?limit=200'),
        api.get('/listings/my'),
      ]);

      const orders = ordersRes.data.sub_orders || [];
      const listings = listingsRes.data.listings || [];

      const delivered = orders.filter(o => ['delivered', 'completed', 'invoice_uploaded'].includes(o.status));
      const totalRevenue = delivered.reduce((s, o) => s + parseFloat(o.total_amount || 0), 0);
      const pendingRevenue = orders
        .filter(o => ['pending', 'accepted', 'packing', 'dispatched'].includes(o.status))
        .reduce((s, o) => s + parseFloat(o.total_amount || 0), 0);

      const statusCount = orders.reduce((acc, o) => {
        acc[o.status] = (acc[o.status] || 0) + 1;
        return acc;
      }, {});

      // Last 7 days
      const dayMap = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
        dayMap[key] = 0;
      }
      orders.forEach(o => {
        const key = new Date(o.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
        if (dayMap[key] !== undefined) dayMap[key]++;
      });

      // Top listings by inventory value
      const topListings = [...listings]
        .sort((a, b) => (b.stock_qty * b.price) - (a.stock_qty * a.price))
        .slice(0, 5);

      setData({ orders, listings, totalRevenue, pendingRevenue, statusCount, dayMap, topListings, delivered });
    } catch (err) { console.error(err); }
    finally { setLoading(false); setRefreshing(false); }
  };

  if (loading) return (
    <View style={[styles.loading, { backgroundColor: c.background }]}>
      <ActivityIndicator size="large" color={c.primary} />
    </View>
  );

  const maxDay = Math.max(...Object.values(data.dayMap), 1);
  const barWidth = ((width - 60) / 7) - 6;

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: c.primary }]}>
        <View>
          <Text style={styles.title}>Reports</Text>
          <Text style={styles.headerSub}>Business overview</Text>
        </View>
        <TouchableOpacity
          style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 }}
          onPress={() => navigation.getParent()?.navigate('ReportDownload')}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>📥 Export</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={c.primary} />}>

        {/* Revenue cards */}
        <View style={styles.statsGrid}>
          <StatCard label="Total Revenue" value={`₹${data.totalRevenue.toLocaleString('en-IN')}`} color="#30D158" bg="#003A10" icon="💰" theme={theme} />
          <StatCard label="Pending Revenue" value={`₹${data.pendingRevenue.toLocaleString('en-IN')}`} color="#F2C94C" bg="#2A1F00" icon="⏳" theme={theme} />
          <StatCard label="Total Orders" value={data.orders.length} color="#0A84FF" bg="#001830" icon="📦" theme={theme} />
          <StatCard label="Listings" value={data.listings.length} color="#30D158" bg="#003A10" icon="🏷" theme={theme} />
        </View>

        {/* 7-day bar chart */}
        <View style={[styles.card, { backgroundColor: c.surface }]}>
          <Text style={[styles.cardTitle, { color: c.text }]}>Orders — last 7 days</Text>
          <View style={styles.barChart}>
            {Object.entries(data.dayMap).map(([day, count]) => (
              <View key={day} style={styles.barCol}>
                {count > 0 && <Text style={styles.barCount}>{count}</Text>}
                <View style={[styles.bar, { height: Math.max(4, (count / maxDay) * 80), backgroundColor: count > 0 ? c.primary : c.surfaceSecondary, width: barWidth }]} />
                <Text style={[styles.barLabel, { color: c.textMuted }]}>{day}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Status breakdown */}
        <View style={[styles.card, { backgroundColor: c.surface }]}>
          <Text style={[styles.cardTitle, { color: c.text }]}>Orders by status</Text>
          {Object.entries(data.statusCount).map(([status, count]) => {
            const pct = Math.round((count / data.orders.length) * 100);
            const color = STATUS_COLORS[status] || '#8E8E93';
            return (
              <View key={status} style={{ marginBottom: 12 }}>
                <View style={styles.statusRow}>
                  <Text style={[styles.statusLabel, { color: c.textMuted }]}>{STATUS_LABELS[status] || status}</Text>
                  <Text style={[styles.statusValue, { color }]}>{count} ({pct}%)</Text>
                </View>
                <View style={[styles.barTrack, { backgroundColor: c.surfaceSecondary }]}>
                  <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: color }]} />
                </View>
              </View>
            );
          })}
        </View>

        {/* Top listings */}
        {data.topListings.length > 0 && (
          <View style={[styles.card, { backgroundColor: c.surface }]}>
            <Text style={[styles.cardTitle, { color: c.text }]}>Top listings by inventory value</Text>
            {data.topListings.map((l, i) => {
              const value = l.stock_qty * parseFloat(l.price);
              const maxValue = data.topListings[0] ? data.topListings[0].stock_qty * parseFloat(data.topListings[0].price) : 1;
              const barColors = ['#0A84FF', '#30D158', '#F2C94C', '#FF9500', '#BF5AF2'];
              return (
                <View key={l.listing_id} style={{ marginBottom: 12 }}>
                  <View style={styles.statusRow}>
                    <Text style={[styles.statusLabel, { color: c.text }]} numberOfLines={1}>
                      {l.brand_name} {l.generic_name}
                    </Text>
                    <Text style={[styles.statusValue, { color: '#F2C94C' }]}>₹{value.toLocaleString('en-IN')}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={[styles.barTrack, { flex: 1, backgroundColor: c.surfaceSecondary }]}>
                      <View style={[styles.barFill, { width: `${(value / maxValue) * 100}%`, backgroundColor: barColors[i] }]} />
                    </View>
                    <Text style={[{ fontSize: 10, color: c.textMuted }]}>Stk: {l.stock_qty}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Recent delivered */}
        <View style={[styles.card, { backgroundColor: c.surface }]}>
          <Text style={[styles.cardTitle, { color: c.text }]}>Recent completed orders</Text>
          {data.delivered.length === 0 ? (
            <Text style={[{ color: c.textMuted, fontSize: 13, textAlign: 'center', paddingVertical: 16 }]}>No completed orders yet</Text>
          ) : data.delivered.slice(0, 5).map(o => (
            <View key={o.sub_order_id} style={[styles.recentRow, { borderBottomColor: c.borderLight }]}>
              <View>
                <Text style={[{ color: c.text, fontWeight: '600', fontSize: 13 }]}>{o.retailer_name}</Text>
                <Text style={[{ color: c.textMuted, fontSize: 11, marginTop: 1 }]}>
                  {new Date(o.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </Text>
              </View>
              <Text style={[{ color: '#30D158', fontWeight: '800', fontSize: 14 }]}>
                ₹{parseFloat(o.total_amount).toLocaleString('en-IN')}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function StatCard({ label, value, color, bg, icon, theme }) {
  const c = theme.colors;
  return (
    <View style={[styles.statCard, { backgroundColor: c.surface }]}>
      <View style={[styles.statIcon, { backgroundColor: bg }]}>
        <Text style={{ fontSize: 18 }}>{icon}</Text>
      </View>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={[styles.statLabel2, { color: c.textMuted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingTop: 52, paddingHorizontal: 20, paddingBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 3 },
  content: { padding: 16, paddingBottom: 32 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  statCard: { width: (width - 44) / 2, borderRadius: 14, padding: 16, alignItems: 'center' },
  statIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  statValue: { fontSize: 20, fontWeight: '800', textAlign: 'center' },
  statLabel2: { fontSize: 11, marginTop: 3, textAlign: 'center' },
  card: { borderRadius: 14, padding: 16, marginBottom: 16 },
  cardTitle: { fontSize: 14, fontWeight: '700', marginBottom: 16 },
  barChart: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 110 },
  barCol: { alignItems: 'center', justifyContent: 'flex-end' },
  barCount: { fontSize: 10, color: '#0A84FF', marginBottom: 2, fontWeight: '700' },
  bar: { borderRadius: 4 },
  barLabel: { fontSize: 9, marginTop: 4, textAlign: 'center' },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  statusLabel: { fontSize: 12 },
  statusValue: { fontSize: 12, fontWeight: '700' },
  barTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
  recentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 0.5 },
});
