import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, SectionList, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
  Alert, ScrollView, TextInput, Modal, Platform
} from 'react-native';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { usePermissions } from '../context/PermissionContext';
import { useFocusEffect } from '@react-navigation/native';

const STATUS_CONFIG = {
  pending:            { label: 'Pending',    color: '#F2C94C', bg: '#2A1F00', next: 'accepted',   nextLabel: '✓ Accept',          nextColor: '#30D158', nextBg: '#003A10' },
  accepted:           { label: 'Accepted',   color: '#1D9E75', bg: '#0A2E22', next: 'packing',    nextLabel: '📦 Start Packing',  nextColor: '#0A84FF', nextBg: '#001830' },
  packing:            { label: 'Packing',    color: '#0A84FF', bg: '#001830', next: 'dispatched', nextLabel: '🚚 Mark Dispatched', nextColor: '#F2C94C', nextBg: '#2A1F00' },
  dispatched:         { label: 'Dispatched', color: '#F2C94C', bg: '#2A1F00', next: null },
  delivered:          { label: 'Delivered',  color: '#30D158', bg: '#003A10', next: null },
  completed:          { label: 'Completed',  color: '#30D158', bg: '#003A10', next: null },
  invoice_uploaded:   { label: 'Invoiced',   color: '#30D158', bg: '#003A10', next: null },
  rejected:           { label: 'Rejected',   color: '#FF453A', bg: '#2A0A0A', next: null },
  auto_cancelled:     { label: 'Cancelled',  color: '#FF9500', bg: '#2A1500', next: null },
};

const STATUS_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'packing', label: 'Packing' },
  { key: 'dispatched', label: 'Dispatched' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'rejected', label: 'Rejected' },
];

const DATE_PRESETS = [
  { key: 'all', label: 'All Time' },
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'this_week', label: 'This Week' },
  { key: 'this_month', label: 'This Month' },
  { key: 'last_month', label: 'Last Month' },
  { key: 'custom', label: '📅 Custom' },
];

const groupByDate = (orders) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const groups = { 'Today': [], 'Yesterday': [], 'This Week': [], 'This Month': [], 'Last Month': [], 'Older': [] };

  orders.forEach(o => {
    const d = new Date(o.created_at);
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    if (day >= today) groups['Today'].push(o);
    else if (day >= yesterday) groups['Yesterday'].push(o);
    else if (day >= weekAgo) groups['This Week'].push(o);
    else if (day >= monthStart) groups['This Month'].push(o);
    else if (day >= lastMonthStart) groups['Last Month'].push(o);
    else groups['Older'].push(o);
  });

  return Object.entries(groups)
    .filter(([, items]) => items.length > 0)
    .map(([title, data]) => ({ title, data }));
};

const filterByDate = (orders, dateFilter, customFrom, customTo) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  return orders.filter(o => {
    const d = new Date(o.created_at);
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    switch (dateFilter) {
      case 'today': return day >= today;
      case 'yesterday': return day >= yesterday && day < today;
      case 'this_week': return day >= weekAgo;
      case 'this_month': return day >= monthStart;
      case 'last_month': return day >= lastMonthStart && day <= lastMonthEnd;
      case 'custom': {
        const from = customFrom ? new Date(customFrom) : null;
        const to = customTo ? new Date(customTo) : null;
        if (from && day < from) return false;
        if (to) { const toEnd = new Date(to); toEnd.setDate(toEnd.getDate() + 1); if (day >= toEnd) return false; }
        return true;
      }
      default: return true;
    }
  });
};

export default function OrdersScreen({ navigation }) {
  const [allOrders, setAllOrders] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [stats, setStats] = useState({});
  const [updating, setUpdating] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const { theme } = useTheme();
  const { can } = usePermissions();
  const c = theme.colors;

  useFocusEffect(useCallback(() => { loadOrders(); }, []));

  const loadOrders = async () => {
    try {
      const res = await api.get('/orders/wholesaler/all?limit=200');
      const orders = res.data.sub_orders || [];
      setAllOrders(orders);
      const s = {};
      STATUS_FILTERS.slice(1).forEach(f => { s[f.key] = orders.filter(o => o.status === f.key).length; });
      setStats(s);
      applyFilters(statusFilter, dateFilter, customFrom, customTo, orders);
    } catch (err) { console.error(err); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const applyFilters = (sf, df, cf, ct, orders = allOrders) => {
    let filtered = sf === 'all' ? orders : orders.filter(o => o.status === sf);
    filtered = filterByDate(filtered, df, cf, ct);
    setSections(groupByDate(filtered));
  };

  const handleStatusFilter = (f) => {
    setStatusFilter(f);
    applyFilters(f, dateFilter, customFrom, customTo);
  };

  const handleDateFilter = (f) => {
    if (f === 'custom') { setShowCustom(true); return; }
    setDateFilter(f);
    applyFilters(statusFilter, f, customFrom, customTo);
  };

  const applyCustomDate = () => {
    setDateFilter('custom');
    setShowCustom(false);
    applyFilters(statusFilter, 'custom', customFrom, customTo);
  };

  const updateStatus = async (subOrderId, status) => {
    setUpdating(subOrderId);
    try {
      if (status === 'accepted') await api.put(`/orders/${subOrderId}/accept`);
      else await api.put(`/orders/${subOrderId}/status`, { status });
      await loadOrders();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to update status');
    } finally { setUpdating(null); }
  };

  const confirmReject = async () => {
    if (!rejectId) return;
    setUpdating(rejectId);
    setRejectId(null);
    try {
      await api.put(`/orders/${rejectId}/reject`, { reason: rejectReason || 'Rejected by wholesaler' });
      setRejectReason('');
      await loadOrders();
    } catch (err) { Alert.alert('Error', 'Failed to reject'); }
    finally { setUpdating(null); }
  };

  const totalFiltered = sections.reduce((s, sec) => s + sec.data.length, 0);

  const renderOrder = ({ item }) => {
    const cfg = STATUS_CONFIG[item.status] || { label: item.status, color: '#8E8E93', bg: '#2A2A2A' };
    const isExpanded = expanded[item.sub_order_id];
    const isUpdating = updating === item.sub_order_id;

    return (
      <View style={[styles.card, { backgroundColor: c.surface, borderLeftColor: cfg.color }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.avatar, { backgroundColor: c.primary }]}>
            <Text style={styles.avatarText}>{item.retailer_name?.charAt(0)?.toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.retailerName, { color: c.text }]}>{item.retailer_name}</Text>
            <Text style={[styles.mobile, { color: c.textMuted }]}>+91 {item.retailer_mobile}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[styles.amount, { color: '#F2C94C' }]}>₹{parseFloat(item.total_amount).toLocaleString('en-IN')}</Text>
            <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
              <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
            </View>
          </View>
        </View>

        {item.status === 'pending' && item.auto_cancel_at && (
          <Text style={styles.autoCancelText}>
            ⏱ Auto-cancels at {new Date(item.auto_cancel_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        )}

        <TouchableOpacity style={[styles.itemToggle, { backgroundColor: c.surfaceSecondary }]}
          onPress={() => setExpanded(p => ({ ...p, [item.sub_order_id]: !p[item.sub_order_id] }))}>
          <Text style={[styles.itemToggleText, { color: c.textMuted }]}>
            {isExpanded ? '▲' : '▼'} {item.items?.length || 0} item{item.items?.length !== 1 ? 's' : ''}
          </Text>
          <Text style={[styles.timeText, { color: c.textMuted }]}>
            🕐 {new Date(item.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </Text>
        </TouchableOpacity>

        {isExpanded && item.items?.map(i => (
          <View key={i.item_id} style={[styles.itemRow, { borderTopColor: c.borderLight }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.itemName, { color: c.text }]}>{i.generic_name}</Text>
              <Text style={[styles.itemBrand, { color: c.primary }]}>{i.brand_name}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.itemQty, { color: c.textMuted }]}>×{i.quantity} · ₹{i.unit_price}</Text>
              <Text style={[styles.itemTotal, { color: '#F2C94C' }]}>₹{parseFloat(i.item_total).toLocaleString('en-IN')}</Text>
            </View>
          </View>
        ))}

        <View style={styles.actionRow}>
          {cfg.next && can('accept_orders') && (
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: cfg.nextBg, borderColor: cfg.nextColor, flex: 1 }]}
              onPress={() => updateStatus(item.sub_order_id, cfg.next)} disabled={isUpdating}>
              <Text style={[styles.actionBtnText, { color: cfg.nextColor }]}>{isUpdating ? '...' : cfg.nextLabel}</Text>
            </TouchableOpacity>
          )}
          {item.status === 'pending' && can('accept_orders') && (
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#2A0A0A', borderColor: '#FF453A' }]}
              onPress={() => { setRejectId(item.sub_order_id); setRejectReason(''); }} disabled={isUpdating}>
              <Text style={[styles.actionBtnText, { color: '#FF453A' }]}>✕ Reject</Text>
            </TouchableOpacity>
          )}
          {item.status === 'dispatched' && can('upload_invoice') && (
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#0A1F35', borderColor: '#185FA5' }]}
              onPress={() => navigation.navigate('UploadInvoice', { subOrder: item })}>
              <Text style={[styles.actionBtnText, { color: '#0A84FF' }]}>🧾 Invoice</Text>
            </TouchableOpacity>
          )}
        </View>

        {['delivered', 'completed', 'invoice_uploaded'].includes(item.status) && (
          <View style={[styles.deliveredBanner, { backgroundColor: '#003A10' }]}>
            <Text style={{ fontSize: 14, color: '#30D158', fontWeight: '700' }}>
              ✅ {item.status === 'invoice_uploaded' ? 'Delivered & Invoiced' : 'Delivered'}
            </Text>
          </View>
        )}
      </View>
    );
  };

  if (loading) return (
    <View style={[styles.loading, { backgroundColor: c.background }]}>
      <ActivityIndicator size="large" color={c.primary} />
    </View>
  );

  const pendingCount = stats.pending || 0;
  const activeDateLabel = DATE_PRESETS.find(d => d.key === dateFilter)?.label || 'All Time';

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: c.primary }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={styles.title}>Orders</Text>
            <Text style={styles.headerSub}>
              {allOrders.length} total{pendingCount > 0 ? ` · ${pendingCount} need action` : ''}
            </Text>
          </View>
          <TouchableOpacity
            style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' }}
            onPress={() => navigation.getParent()?.navigate('ReportDownload')}>
            <Text style={{ fontSize: 14 }}>📥</Text>
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>Report</Text>
          </TouchableOpacity>
        </View>
      </View>
      {/* Date filter */}
      <View style={[styles.filterSection, { backgroundColor: c.surface, borderBottomColor: c.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
          {DATE_PRESETS.map(d => (
            <TouchableOpacity key={d.key}
              style={[styles.filterChip, { backgroundColor: dateFilter === d.key ? c.primary : c.surfaceSecondary }]}
              onPress={() => handleDateFilter(d.key)}>
              <Text style={[styles.filterChipText, { color: dateFilter === d.key ? '#fff' : c.textMuted }]}>{d.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        {dateFilter === 'custom' && customFrom && (
          <Text style={[styles.customDateLabel, { color: c.textMuted }]}>
            {customFrom} → {customTo || 'now'}
          </Text>
        )}
      </View>

      {/* Status filter */}
      <View style={[styles.filterSection, { backgroundColor: c.surface, borderBottomColor: c.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
          {STATUS_FILTERS.map(f => {
            const count = f.key === 'all' ? allOrders.length : (stats[f.key] || 0);
            const active = statusFilter === f.key;
            return (
              <TouchableOpacity key={f.key}
                style={[styles.statusChip, { borderBottomColor: active ? c.primary : 'transparent', borderBottomWidth: 2 }]}
                onPress={() => handleStatusFilter(f.key)}>
                <Text style={[styles.statusChipCount, { color: active ? c.primary : c.textMuted, fontWeight: active ? '800' : '600' }]}>{count}</Text>
                <Text style={[styles.statusChipLabel, { color: active ? c.primary : c.textMuted, fontWeight: active ? '700' : '400' }]}>{f.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Results count */}
      <View style={[styles.resultsBar, { backgroundColor: c.background }]}>
        <Text style={[styles.resultsText, { color: c.textMuted }]}>
          {totalFiltered} order{totalFiltered !== 1 ? 's' : ''} · {activeDateLabel}
        </Text>
      </View>

      {/* Reject modal */}
      {rejectId && (
        <View style={styles.rejectOverlay}>
          <View style={[styles.rejectModal, { backgroundColor: c.surface }]}>
            <Text style={[styles.rejectTitle, { color: c.text }]}>Reject Order</Text>
            <TextInput style={[styles.rejectInput, { backgroundColor: c.surfaceSecondary, color: c.text, borderColor: c.border }]}
              placeholder="Reason (optional)" placeholderTextColor={c.textMuted}
              value={rejectReason} onChangeText={setRejectReason} />
            <View style={styles.rejectBtns}>
              <TouchableOpacity style={[styles.rejectCancelBtn, { backgroundColor: c.surfaceSecondary }]} onPress={() => setRejectId(null)}>
                <Text style={{ color: c.textMuted, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.rejectConfirmBtn} onPress={confirmReject}>
                <Text style={{ color: '#FF453A', fontWeight: '700' }}>✕ Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Custom date modal */}
      <Modal visible={showCustom} transparent animationType="slide">
        <View style={styles.rejectOverlay}>
          <View style={[styles.rejectModal, { backgroundColor: c.surface }]}>
            <Text style={[styles.rejectTitle, { color: c.text }]}>📅 Custom Date Range</Text>
            <Text style={[{ color: c.textMuted, fontSize: 12, marginBottom: 6 }]}>From date (YYYY-MM-DD)</Text>
            <TextInput style={[styles.rejectInput, { backgroundColor: c.surfaceSecondary, color: c.text, borderColor: c.border }]}
              placeholder="2026-01-01" placeholderTextColor={c.textMuted}
              value={customFrom} onChangeText={setCustomFrom} />
            <Text style={[{ color: c.textMuted, fontSize: 12, marginBottom: 6 }]}>To date (YYYY-MM-DD)</Text>
            <TextInput style={[styles.rejectInput, { backgroundColor: c.surfaceSecondary, color: c.text, borderColor: c.border }]}
              placeholder="2026-12-31" placeholderTextColor={c.textMuted}
              value={customTo} onChangeText={setCustomTo} />
            <View style={styles.rejectBtns}>
              <TouchableOpacity style={[styles.rejectCancelBtn, { backgroundColor: c.surfaceSecondary }]}
                onPress={() => setShowCustom(false)}>
                <Text style={{ color: c.textMuted, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.rejectConfirmBtn, { backgroundColor: '#0A1F35', borderColor: c.primary }]}
                onPress={applyCustomDate}>
                <Text style={{ color: c.primary, fontWeight: '700' }}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Orders list */}
      <SectionList
        sections={sections}
        renderItem={renderOrder}
        renderSectionHeader={({ section }) => (
          <View style={[styles.sectionHeader, { backgroundColor: c.background }]}>
            <Text style={[styles.sectionTitle, { color: c.text }]}>{section.title}</Text>
            <View style={[styles.sectionBadge, { backgroundColor: c.surfaceSecondary }]}>
              <Text style={[styles.sectionCount, { color: c.textMuted }]}>{section.data.length}</Text>
            </View>
          </View>
        )}
        keyExtractor={item => item.sub_order_id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadOrders(); }}
            tintColor={c.primary} colors={[c.primary]} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={[styles.emptyTitle, { color: c.text }]}>No orders found</Text>
            <Text style={[styles.emptySub, { color: c.textMuted }]}>
              {dateFilter !== 'all' ? `No orders for ${activeDateLabel}` : 'No orders yet'}
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
  header: { paddingTop: 52, paddingHorizontal: 20, paddingBottom: 16 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 3 },

  filterSection: { borderBottomWidth: 1 },
  filterContent: { paddingHorizontal: 12, paddingVertical: 8, gap: 8, flexDirection: 'row', alignItems: 'center' },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  filterChipText: { fontSize: 12, fontWeight: '600' },
  customDateLabel: { fontSize: 11, paddingHorizontal: 12, paddingBottom: 6 },

  statusChip: { paddingHorizontal: 14, paddingVertical: 10, alignItems: 'center', minWidth: 72 },
  statusChipCount: { fontSize: 17, marginBottom: 2 },
  statusChipLabel: { fontSize: 10 },

  resultsBar: { paddingHorizontal: 16, paddingVertical: 6 },
  resultsText: { fontSize: 12 },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  sectionTitle: { fontSize: 13, fontWeight: '700' },
  sectionBadge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  sectionCount: { fontSize: 11, fontWeight: '600' },

  list: { paddingBottom: 24 },

  card: { marginHorizontal: 12, marginBottom: 10, borderRadius: 14, padding: 14, elevation: 1, borderLeftWidth: 4 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  retailerName: { fontSize: 14, fontWeight: '700' },
  mobile: { fontSize: 11, marginTop: 1 },
  amount: { fontSize: 16, fontWeight: '800' },
  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginTop: 3 },
  statusText: { fontSize: 10, fontWeight: '700' },

  autoCancelText: { fontSize: 11, color: '#FF453A', marginBottom: 8 },

  itemToggle: { borderRadius: 8, padding: 8, marginBottom: 4, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemToggleText: { fontSize: 12 },
  timeText: { fontSize: 10 },

  itemRow: { flexDirection: 'row', paddingVertical: 8, borderTopWidth: 0.5, justifyContent: 'space-between' },
  itemName: { fontSize: 13, fontWeight: '500' },
  itemBrand: { fontSize: 11, marginTop: 1 },
  itemQty: { fontSize: 11 },
  itemTotal: { fontSize: 12, fontWeight: '700', marginTop: 2 },

  actionRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  actionBtn: { borderRadius: 10, height: 42, justifyContent: 'center', alignItems: 'center', borderWidth: 1, paddingHorizontal: 14 },
  actionBtnText: { fontWeight: '700', fontSize: 13 },

  deliveredBanner: { borderRadius: 10, padding: 10, marginTop: 10, alignItems: 'center' },

  rejectOverlay: { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 100, justifyContent: 'center', alignItems: 'center' },
  rejectModal: { width: 320, borderRadius: 16, padding: 24 },
  rejectTitle: { fontSize: 16, fontWeight: '700', marginBottom: 16 },
  rejectInput: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 14, marginBottom: 16 },
  rejectBtns: { flexDirection: 'row', gap: 10 },
  rejectCancelBtn: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center' },
  rejectConfirmBtn: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center', backgroundColor: '#2A0A0A', borderWidth: 1, borderColor: '#FF453A' },

  empty: { alignItems: 'center', marginTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 6 },
  emptySub: { fontSize: 14 },
});
