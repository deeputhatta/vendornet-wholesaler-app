import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl, Alert
} from 'react-native';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';

export default function OrdersScreen({ navigation }) {
  const [subOrders, setSubOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { theme } = useTheme();
  const c = theme.colors;

  useEffect(() => { loadOrders(); }, []);

  const loadOrders = async () => {
    try {
      const res = await api.get('/orders/pending');
      setSubOrders(res.data.sub_orders);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const acceptOrder = async (subOrderId) => {
    try {
      await api.put(`/orders/${subOrderId}/accept`);
      Alert.alert('Success', 'Order accepted');
      loadOrders();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to accept');
    }
  };

  const rejectOrder = async (subOrderId) => {
    Alert.alert('Reject Order', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject', style: 'destructive',
        onPress: async () => {
          try {
            await api.put(`/orders/${subOrderId}/reject`, { reason: 'Out of stock' });
            Alert.alert('Order rejected');
            loadOrders();
          } catch (err) {
            Alert.alert('Error', 'Failed to reject');
          }
        }
      }
    ]);
  };

  const renderOrder = ({ item }) => (
    <View style={[styles.card, { backgroundColor: c.surface, shadowColor: c.text }]}>

      {/* Card header */}
      <View style={[styles.cardHeader, { borderBottomColor: c.borderLight }]}>
        <View>
          <Text style={[styles.retailerName, { color: c.text }]}>
            {item.retailer_name}
          </Text>
          <Text style={[styles.mobile, { color: c.primary }]}>
            {item.retailer_mobile}
          </Text>
        </View>
        <Text style={[styles.amount, { color: c.primary }]}>
          ₹{parseFloat(item.total_amount).toLocaleString('en-IN')}
        </Text>
      </View>

      {/* Address */}
      <Text style={[styles.address, { color: c.textMuted }]}>
        📍 {item.retailer_address}
      </Text>

      {/* Items */}
      {item.items?.map(i => (
        <View key={i.item_id} style={[styles.itemRow, { borderTopColor: c.borderLight }]}>
          <Text style={[styles.itemName, { color: c.text }]}>
            {i.generic_name} — {i.brand_name}
          </Text>
          <Text style={[styles.itemQty, { color: c.textMuted }]}>
            Qty: {i.quantity} × ₹{i.unit_price}
          </Text>
        </View>
      ))}

      {/* Auto cancel warning */}
      <Text style={[styles.autoCancel, { color: c.error }]}>
        ⏱ Auto cancels: {new Date(item.auto_cancel_at).toLocaleTimeString('en-IN')}
      </Text>

      {/* Accept / Reject */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.acceptBtn, { backgroundColor: c.primary }]}
          onPress={() => acceptOrder(item.sub_order_id)}
        >
          <Text style={styles.acceptText}>✓ Accept</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.rejectBtn, { backgroundColor: '#FCEBEB' }]}
          onPress={() => rejectOrder(item.sub_order_id)}
        >
          <Text style={styles.rejectText}>✕ Reject</Text>
        </TouchableOpacity>
      </View>

      {/* Assign Driver / Upload Invoice */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.driverBtn, { backgroundColor: c.primaryLight }]}
          onPress={() => navigation.navigate('AssignDriver', { subOrder: item })}
        >
          <Text style={[styles.driverText, { color: c.primary }]}>🚚 Assign Driver</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.invoiceBtn, { backgroundColor: '#FAEEDA' }]}
          onPress={() => navigation.navigate('UploadInvoice', { subOrder: item })}
        >
          <Text style={styles.invoiceText}>🧾 Upload Invoice</Text>
        </TouchableOpacity>
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
      <View style={[styles.header, { backgroundColor: c.primary }]}>
        <Text style={styles.title}>Pending Orders</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{subOrders.length} orders</Text>
        </View>
      </View>

      <FlatList
        data={subOrders}
        renderItem={renderOrder}
        keyExtractor={item => item.sub_order_id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadOrders(); }}
            tintColor={c.primary}
            colors={[c.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={[styles.emptyText, { color: c.textMuted }]}>
              No pending orders
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    padding: 20, paddingTop: 48,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  title: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  countBadge: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20,
  },
  countText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 12, paddingBottom: 24 },
  card: {
    borderRadius: 14, padding: 16,
    marginBottom: 12, elevation: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 3,
  },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', paddingBottom: 10,
    borderBottomWidth: 0.5, marginBottom: 8,
  },
  retailerName: { fontSize: 16, fontWeight: '700' },
  mobile: { fontSize: 13, marginTop: 2 },
  amount: { fontSize: 22, fontWeight: '800' },
  address: { fontSize: 12, marginBottom: 10 },
  itemRow: { paddingVertical: 6, borderTopWidth: 0.5 },
  itemName: { fontSize: 13, fontWeight: '500' },
  itemQty: { fontSize: 12, marginTop: 2 },
  autoCancel: { fontSize: 12, marginTop: 10, fontWeight: '500' },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  acceptBtn: {
    flex: 1, borderRadius: 10, height: 44,
    justifyContent: 'center', alignItems: 'center',
  },
  acceptText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  rejectBtn: {
    flex: 1, borderRadius: 10, height: 44,
    justifyContent: 'center', alignItems: 'center',
  },
  rejectText: { color: '#791F1F', fontWeight: '700', fontSize: 14 },
  driverBtn: {
    flex: 1, borderRadius: 10, height: 44,
    justifyContent: 'center', alignItems: 'center',
  },
  driverText: { fontWeight: '600', fontSize: 13 },
  invoiceBtn: {
    flex: 1, borderRadius: 10, height: 44,
    justifyContent: 'center', alignItems: 'center',
  },
  invoiceText: { color: '#633806', fontWeight: '600', fontSize: 13 },
  empty: { alignItems: 'center', marginTop: 100 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16 },
});