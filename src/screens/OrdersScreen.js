import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl, Alert
} from 'react-native';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function OrdersScreen({ navigation }) {
  const [subOrders, setSubOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    loadOrders();
  }, []);

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
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.retailerName}>{item.retailer_name}</Text>
        <Text style={styles.mobile}>{item.retailer_mobile}</Text>
      </View>
      <Text style={styles.address}>{item.retailer_address}</Text>
      <Text style={styles.amount}>
        ₹{parseFloat(item.total_amount).toLocaleString('en-IN')}
      </Text>

      {item.items?.map(i => (
        <View key={i.item_id} style={styles.itemRow}>
          <Text style={styles.itemName}>{i.generic_name} — {i.brand_name}</Text>
          <Text style={styles.itemQty}>Qty: {i.quantity} × ₹{i.unit_price}</Text>
        </View>
      ))}

      <Text style={styles.autoCancel}>
        Auto cancels: {new Date(item.auto_cancel_at).toLocaleTimeString('en-IN')}
      </Text>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.acceptBtn}
          onPress={() => acceptOrder(item.sub_order_id)}
        >
          <Text style={styles.acceptText}>Accept</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.rejectBtn}
          onPress={() => rejectOrder(item.sub_order_id)}
        >
          <Text style={styles.rejectText}>Reject</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color="#0F6E56" />
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Pending Orders</Text>
        <Text style={styles.count}>{subOrders.length} orders</Text>
      </View>
      <FlatList
        data={subOrders}
        renderItem={renderOrder}
        keyExtractor={item => item.sub_order_id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => {
            setRefreshing(true);
            loadOrders();
          }} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No pending orders</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { backgroundColor: '#0F6E56', padding: 20, paddingTop: 48, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  count: { fontSize: 14, color: '#9FE1CB', backgroundColor: '#085041', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: '#fff', margin: 8, marginHorizontal: 12, borderRadius: 12, padding: 16, elevation: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  retailerName: { fontSize: 16, fontWeight: '600', color: '#333' },
  mobile: { fontSize: 13, color: '#0F6E56' },
  address: { fontSize: 12, color: '#888', marginBottom: 8 },
  amount: { fontSize: 22, fontWeight: 'bold', color: '#0F6E56', marginBottom: 10 },
  itemRow: { paddingVertical: 4, borderTopWidth: 0.5, borderTopColor: '#eee' },
  itemName: { fontSize: 13, color: '#333', fontWeight: '500' },
  itemQty: { fontSize: 12, color: '#888' },
  autoCancel: { fontSize: 11, color: '#E24B4A', marginTop: 8 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  acceptBtn: { flex: 1, backgroundColor: '#0F6E56', borderRadius: 8, height: 44, justifyContent: 'center', alignItems: 'center' },
  acceptText: { color: '#fff', fontWeight: '600' },
  rejectBtn: { flex: 1, backgroundColor: '#FCEBEB', borderRadius: 8, height: 44, justifyContent: 'center', alignItems: 'center' },
  rejectText: { color: '#791F1F', fontWeight: '600' }
});