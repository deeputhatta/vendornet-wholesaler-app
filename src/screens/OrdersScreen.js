import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, SectionList, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
  Alert, ScrollView
} from 'react-native';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { usePermissions } from '../context/PermissionContext';
import { useFocusEffect } from '@react-navigation/native';

const STATUS_CONFIG = {
  pending:            { label: 'Pending',          color: '#F2C94C', bg: '#2A1F00' },
  accepted:           { label: 'Accepted',          color: '#1D9E75', bg: '#0A2E22' },
  partially_accepted: { label: 'Partial',           color: '#185FA5', bg: '#0A1F35' },
  packing:            { label: 'Packing',           color: '#0A84FF', bg: '#001830' },
  dispatched:         { label: 'Dispatched',        color: '#F2C94C', bg: '#2A1F00' },
  delivered:          { label: 'Delivered',         color: '#30D158', bg: '#003A10' },
  completed:          { label: 'Completed',         color: '#30D158', bg: '#003A10' },
  invoice_uploaded:   { label: 'Invoiced',          color: '#30D158', bg: '#003A10' },
  rejected:           { label: 'Rejected',          color: '#FF453A', bg: '#2A0A0A' },
  auto_cancelled:     { label: 'Cancelled',         color: '#FF9500', bg: '#2A1500' },
};

const FILTERS = [
  { key: 'all',               label: 'All' },
  { key: 'pending',           label: 'Pending' },
  { key: 'accepted',          label: 'Accepted' },
  { key: 'packing',           label: 'Packing' },
  { key: 'dispatched',        label: 'Dispatched' },
  { key: 'delivered',         label: 'Delivered' },
  { key: 'rejected',          label: 'Rejected' },
];

const groupByDate = (orders) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const thisWeekStart = new Date(today);
  thisWeekStart.setDate(thisWeekStart.getDate() - 7);
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const groups = {
    'Today': [],
    'Yesterday': [],
    'This Week': [],
    'This Month': [],
    'Last Month': [],
    'Older': [],
  };

  orders.forEach(order => {
    const orderDate = new Date(order.created_at);
    const orderDay = new Date(orderDate.getFullYear(), orderDate.getMonth(), orderDate.getDate());

    if (orderDay >= today) {
      groups['Today'].push(order);
    } else if (orderDay >= yesterday && orderDay < today) {
      groups['Yesterday'].push(order);
    } else if (orderDay >= thisWeekStart && orderDay < yesterday) {
      groups['This Week'].push(order);
    } else if (orderDay >= thisMonthStart && orderDay < thisWeekStart) {
      groups['This Month'].push(order);
    } else if (orderDay >= lastMonthStart && orderDay < thisMonthStart) {
      groups['Last Month'].push(order);
    } else {
      groups['Older'].push(order);
    }
  });

  return Object.entries(groups)
    .filter(([, items]) => items.length > 0)
    .map(([title, data]) => ({ title, data }));
};

export default function OrdersScreen({ navigation }) {
  const [allOrders, setAllOrders] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [stats, setStats] = useState({});
  const { theme } = useTheme();
  const { can } = usePermissions();
  const c = theme.colors;

  useFocusEffect(
    useCallback(() => { loadOrders(); }, [])
  );

  const loadOrders = async () => {
    try {
      const res = await api.get('/orders/wholesaler/all?limit=100');
      const orders = res.data.sub_orders || [];
      setAllOrders(orders);

      // Calculate stats
      const s = {};
      FILTERS.slice(1).forEach(f => {
        s[f.key] = orders.filter(o => o.status === f.key).length;
      });
      setStats(s);

      applyFilter(filter, orders);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const applyFilter = (f, orders = allOrders) => {
    const filtered = f === 'all' ? orders : orders.filter(o => o.status === f);
    setSections(groupByDate(filtered));
  };

  const handleFilter = (f) => {
    setFilter(f);
    applyFilter(f);
  };

  const acceptOrder = async (subOrderId) => {
    try {
      await api.put(`/orders/${subOrderId}/accept`);
      Alert.alert('✓ Accepted', 'Order accepted successfully');
      loadOrders();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to accept');
    }
  };

  const rejectOrder = async (subOrderId) => {
    Alert.alert('Reject Order', 'Are you sure you want to reject this order?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject', style: 'destructive',
        onPress: async () => {
          try {
            await api.put(`/orders/${subOrderId}/reject`, { reason: 'Out of stock' });
            loadOrders();
          } catch (err) {
            Alert.alert('Error', 'Failed to reject');
          }
        }
      }
    ]);
  };

  const renderOrder = ({ item }) => {
    const config = STATUS_CONFIG[item.status] || { label: item.status, color: '#8E8E93', bg: '#2A2A2A' };
    const isPending = item.status === 'pending';
    const isAccepted = item.status === 'accepted';
    const isPacking = item.status === 'packing';
    const isDispatched = item.status === 'dispatched';
    const isDelivered = ['delivered', 'completed', 'invoice_uploaded'].includes(item.status);

    return (
      <View style={[styles.card, {
        backgroundColor: c.surface,
        shadowColor: c.text,
        borderLeftColor: config.color,
      }]}>
        {/* Header */}
        <View style={[styles.cardHeader, { borderBottomColor: c.borderLight }]}>
          <View style={styles.retailerRow}>
            <View style={[styles.avatar, { backgroundColor: c.primary }]}>
              <Text style={styles.avatarText}>
                {item.retailer_name?.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.retailerInfo}>
              <Text style={[styles.retailerName, { color: c.text }]}>
                {item.retailer_name}
              </Text>
              <Text style={[styles.mobile, { color: c.textMuted }]}>
                +91 {item.retailer_mobile}
              </Text>
            </View>
            <View>
              <Text style={[styles.amount, { color: c.primary }]}>
                ₹{parseFloat(item.total_amount).toLocaleString('en-IN')}
              </Text>
              <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
                <Text style={[styles.statusText, { color: config.color }]}>
                  {config.label}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Address */}
        <Text style={[styles.address, { color: c.textMuted }]} numberOfLines={1}>
          📍 {item.retailer_address}
        </Text>

        {/* Items */}
        {item.items?.map((i, idx) => (
          <View key={i.item_id} style={[styles.itemRow, {
            borderTopColor: c.borderLight,
            borderTopWidth: idx === 0 ? 0.5 : 0,
          }]}>
            <Text style={[styles.itemName, { color: c.text }]}>
              {i.generic_name} — {i.brand_name}
            </Text>
            <Text style={[styles.itemQty, { color: c.textMuted }]}>
              {i.quantity} units × ₹{i.unit_price} = ₹{parseFloat(i.item_total).toLocaleString('en-IN')}
            </Text>
          </View>
        ))}

        {/* Time info */}
        <Text style={[styles.timeText, { color: c.textMuted }]}>
          🕐 {new Date(item.created_at).toLocaleString('en-IN', {
            day: 'numeric', month: 'short',
            hour: '2-digit', minute: '2-digit'
          })}
          {isPending && item.auto_cancel_at && (
            <Text style={{ color: '#FF453A' }}>
              {' · '}⏱ Auto cancels: {new Date(item.auto_cancel_at).toLocaleTimeString('en-IN', {
                hour: '2-digit', minute: '2-digit'
              })}
            </Text>
          )}
        </Text>

        {/* Actions based on status */}
        {isPending && can('accept_orders') && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.acceptBtn, { backgroundColor: c.primary }]}
              onPress={() => acceptOrder(item.sub_order_id)}
            >
              <Text style={styles.acceptText}>✓ Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.rejectBtn, { backgroundColor: '#2A0A0A' }]}
              onPress={() => rejectOrder(item.sub_order_id)}
            >
              <Text style={[styles.rejectText, { color: '#FF453A' }]}>✕ Reject</Text>
            </TouchableOpacity>
          </View>
        )}

        {(isAccepted || isPacking) && (
          <View style={styles.actionRow}>
            {can('assign_driver') && (
              <TouchableOpacity
                style={[styles.driverBtn, { backgroundColor: c.primaryLight }]}
                onPress={() => navigation.navigate('AssignDriver', { subOrder: item })}
              >
                <Text style={[styles.driverText, { color: c.primary }]}>🚚 Assign Driver</Text>
              </TouchableOpacity>
            )}
            {can('upload_invoice') && (
              <TouchableOpacity
                style={[styles.invoiceBtn, { backgroundColor: '#2A1F00' }]}
                onPress={() => navigation.navigate('UploadInvoice', { subOrder: item })}
              >
                <Text style={[styles.invoiceText, { color: '#F2C94C' }]}>🧾 Invoice</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {isDispatched && (
          <View style={[styles.dispatchedBanner, { backgroundColor: '#2A1F00' }]}>
            <Text style={styles.dispatchedIcon}>🚚</Text>
            <Text style={[styles.dispatchedText, { color: '#F2C94C' }]}>
              Out for delivery
            </Text>
            {can('upload_invoice') && (
              <TouchableOpacity
                style={[styles.invoiceSmallBtn, { backgroundColor: c.primary }]}
                onPress={() => navigation.navigate('UploadInvoice', { subOrder: item })}
              >
                <Text style={styles.invoiceSmallText}>🧾 Invoice</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {isDelivered && (
          <View style={[styles.deliveredBanner, { backgroundColor: '#003A10' }]}>
            <Text style={styles.deliveredIcon}>✅</Text>
            <Text style={[styles.deliveredText, { color: '#30D158' }]}>
              {item.status === 'invoice_uploaded' ? 'Delivered & Invoiced' : 'Delivered'}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderSectionHeader = ({ section }) => (
    <View style={[styles.sectionHeader, { backgroundColor: c.background }]}>
      <Text style={[styles.sectionTitle, { color: c.text }]}>{section.title}</Text>
      <View style={[styles.sectionBadge, { backgroundColor: c.surfaceSecondary }]}>
        <Text style={[styles.sectionCount, { color: c.textMuted }]}>
          {section.data.length}
        </Text>
      </View>
    </View>
  );

  if (loading) return (
    <View style={[styles.loading, { backgroundColor: c.background }]}>
      <ActivityIndicator size="large" color={c.primary} />
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>

      {/* Header */}
      <View style={[styles.header, { backgroundColor: c.primary }]}>
        <Text style={styles.title}>Manage Orders</Text>
        <Text style={styles.headerSub}>{allOrders.length} total orders</Text>
      </View>

      {/* Stats row */}
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        style={[styles.statsScroll, { backgroundColor: c.surface, borderBottomColor: c.border }]}
        contentContainerStyle={styles.statsContent}
      >
        {[
          { key: 'all', label: 'All', value: allOrders.length, color: c.text },
          { key: 'pending', label: 'Pending', value: stats.pending || 0, color: '#F2C94C' },
          { key: 'accepted', label: 'Accepted', value: stats.accepted || 0, color: '#1D9E75' },
          { key: 'packing', label: 'Packing', value: stats.packing || 0, color: '#0A84FF' },
          { key: 'dispatched', label: 'Dispatched', value: stats.dispatched || 0, color: '#F2C94C' },
          { key: 'delivered', label: 'Delivered', value: stats.delivered || 0, color: '#30D158' },
          { key: 'rejected', label: 'Rejected', value: stats.rejected || 0, color: '#FF453A' },
        ].map(s => (
          <TouchableOpacity
            key={s.key}
            style={[styles.statBtn, {
              borderBottomColor: filter === s.key ? c.primary : 'transparent',
            }]}
            onPress={() => handleFilter(s.key)}
          >
            <Text style={[styles.statValue, {
              color: filter === s.key ? c.primary : s.color,
              fontWeight: filter === s.key ? '800' : '600',
            }]}>
              {s.value}
            </Text>
            <Text style={[styles.statLabel, {
              color: filter === s.key ? c.primary : c.textMuted,
              fontWeight: filter === s.key ? '700' : '400',
            }]}>
              {s.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Orders list */}
      <SectionList
        sections={sections}
        renderItem={renderOrder}
        renderSectionHeader={renderSectionHeader}
        keyExtractor={item => item.sub_order_id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadOrders(); }}
            tintColor={c.primary} colors={[c.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={[styles.emptyTitle, { color: c.text }]}>No orders found</Text>
            <Text style={[styles.emptySub, { color: c.textMuted }]}>
              {filter !== 'all' ? `No ${filter} orders` : 'No orders yet'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: { padding: 20, paddingTop: 48 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 3 },

  // Stats scroll
  statsScroll: { borderBottomWidth: 1, maxHeight: 90 },
statsContent: { paddingHorizontal: 4, paddingVertical: 4 },
statBtn: {
  paddingHorizontal: 18, paddingVertical: 12,
  alignItems: 'center', borderBottomWidth: 3, minWidth: 90,
},
statValue: { fontSize: 18, marginBottom: 3 },
statLabel: { fontSize: 11 },

  // Section header
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 8, gap: 8,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700' },
  sectionBadge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  sectionCount: { fontSize: 11, fontWeight: '600' },

  list: { paddingBottom: 24 },

  // Card
  card: {
    marginHorizontal: 12, marginBottom: 10,
    borderRadius: 14, padding: 14,
    elevation: 1, borderLeftWidth: 4,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 3,
  },
  cardHeader: { paddingBottom: 10, borderBottomWidth: 0.5, marginBottom: 8 },
  retailerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  retailerInfo: { flex: 1 },
  retailerName: { fontSize: 15, fontWeight: '700' },
  mobile: { fontSize: 12, marginTop: 1 },
  amount: { fontSize: 16, fontWeight: '800', textAlign: 'right' },
  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginTop: 3, alignSelf: 'flex-end' },
  statusText: { fontSize: 10, fontWeight: '700' },

  address: { fontSize: 12, marginBottom: 8 },

  itemRow: { paddingVertical: 5 },
  itemName: { fontSize: 13, fontWeight: '500' },
  itemQty: { fontSize: 11, marginTop: 1 },

  timeText: { fontSize: 11, marginTop: 8, marginBottom: 4 },

  // Actions
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  acceptBtn: { flex: 1, borderRadius: 10, height: 42, justifyContent: 'center', alignItems: 'center' },
  acceptText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  rejectBtn: { flex: 1, borderRadius: 10, height: 42, justifyContent: 'center', alignItems: 'center' },
  rejectText: { fontWeight: '700', fontSize: 13 },
  driverBtn: { flex: 1, borderRadius: 10, height: 42, justifyContent: 'center', alignItems: 'center' },
  driverText: { fontWeight: '600', fontSize: 13 },
  invoiceBtn: { flex: 1, borderRadius: 10, height: 42, justifyContent: 'center', alignItems: 'center' },
  invoiceText: { fontWeight: '600', fontSize: 13 },

  dispatchedBanner: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 10, padding: 10, marginTop: 10, gap: 8,
  },
  dispatchedIcon: { fontSize: 16 },
  dispatchedText: { flex: 1, fontSize: 13, fontWeight: '600' },
  invoiceSmallBtn: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  invoiceSmallText: { color: '#fff', fontSize: 11, fontWeight: '600' },

  deliveredBanner: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 10, padding: 10, marginTop: 10, gap: 8,
  },
  deliveredIcon: { fontSize: 16 },
  deliveredText: { fontSize: 13, fontWeight: '600' },

  empty: { alignItems: 'center', marginTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 6 },
  emptySub: { fontSize: 14 },
});