import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
  Linking, Alert
} from 'react-native';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';

const STATUS_STEPS = [
  { key: 'accepted',   label: 'Accepted',   icon: '✓' },
  { key: 'packing',    label: 'Packing',     icon: '📦' },
  { key: 'dispatched', label: 'Dispatched',  icon: '🚚' },
  { key: 'delivered',  label: 'Delivered',   icon: '🎉' },
];

const STATUS_COLORS = {
  packing:    { color: '#0A84FF', bg: '#001830' },
  dispatched: { color: '#F2C94C', bg: '#2A1F00' },
  delivered:  { color: '#30D158', bg: '#003A10' },
};

export default function DeliveryTrackingScreen({ navigation }) {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { theme } = useTheme();
  const c = theme.colors;

  useEffect(() => {
    loadDeliveries();
    const interval = setInterval(loadDeliveries, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadDeliveries = async () => {
    try {
      const res = await api.get('/delivery/active');
      setDeliveries(res.data.deliveries || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const dispatchOrder = async (subOrderId) => {
    Alert.alert('Dispatch Order', 'Mark this order as dispatched?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Dispatch', onPress: async () => {
          try {
            await api.put(`/delivery/${subOrderId}/dispatch`);
            loadDeliveries();
            Alert.alert('✓ Dispatched', 'Order marked as dispatched');
          } catch (err) {
            Alert.alert('Error', err.response?.data?.error || 'Failed to dispatch');
          }
        }
      }
    ]);
  };

  const callDriver = (mobile) => {
    Linking.openURL(`tel:+91${mobile}`);
  };

  const getStepIndex = (status) => {
    return STATUS_STEPS.findIndex(s => s.key === status);
  };

  if (loading) return (
    <View style={[styles.loading, { backgroundColor: c.background }]}>
      <ActivityIndicator size="large" color={c.primary} />
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: c.primary }]}>
        <Text style={styles.headerTitle}>Delivery Tracking</Text>
        <Text style={styles.headerSub}>
          {deliveries.length} active {deliveries.length === 1 ? 'delivery' : 'deliveries'}
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadDeliveries(); }}
            tintColor={c.primary} colors={[c.primary]}
          />
        }
      >
        {deliveries.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🚚</Text>
            <Text style={[styles.emptyTitle, { color: c.text }]}>No active deliveries</Text>
            <Text style={[styles.emptySub, { color: c.textMuted }]}>
              Assign a driver to an accepted order to start tracking
            </Text>
            <TouchableOpacity
              style={[styles.goBtn, { backgroundColor: c.primary }]}
              onPress={() => navigation.navigate('Orders')}
            >
              <Text style={styles.goBtnText}>Go to Orders →</Text>
            </TouchableOpacity>
          </View>
        ) : (
          deliveries.map((delivery) => {
            const statusConfig = STATUS_COLORS[delivery.order_status] ||
              { color: c.textMuted, bg: c.surfaceSecondary };
            const stepIndex = getStepIndex(delivery.order_status);

            return (
              <View
                key={delivery.delivery_id}
                style={[styles.card, { backgroundColor: c.surface, shadowColor: c.text }]}
              >
                {/* Card header */}
                <View style={[styles.cardHeader, { borderBottomColor: c.borderLight }]}>
                  <View style={styles.retailerRow}>
                    <View style={[styles.avatar, { backgroundColor: c.primary }]}>
                      <Text style={styles.avatarText}>
                        {delivery.retailer_name?.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.retailerInfo}>
                      <Text style={[styles.retailerName, { color: c.text }]}>
                        {delivery.retailer_name}
                      </Text>
                      <Text style={[styles.retailerAddress, { color: c.textMuted }]}
                        numberOfLines={1}>
                        📍 {delivery.retailer_address}
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
                      <Text style={[styles.statusText, { color: statusConfig.color }]}>
                        {delivery.order_status}
                      </Text>
                    </View>
                  </View>

                  <Text style={[styles.amount, { color: c.primary }]}>
                    ₹{parseFloat(delivery.total_amount).toLocaleString('en-IN')}
                  </Text>
                </View>

                {/* Progress steps */}
                <View style={styles.stepsContainer}>
                  {STATUS_STEPS.map((step, i) => {
                    const done = i <= stepIndex;
                    const active = i === stepIndex;
                    return (
                      <View key={step.key} style={styles.stepWrapper}>
                        <View style={[styles.stepCircle, {
                          backgroundColor: done ? c.primary : c.borderLight,
                          borderColor: active ? c.accent : done ? c.primary : c.border,
                          borderWidth: active ? 2 : 0,
                        }]}>
                          <Text style={[styles.stepIcon, {
                            fontSize: done ? 12 : 10,
                          }]}>
                            {done ? step.icon : '○'}
                          </Text>
                        </View>
                        <Text style={[styles.stepLabel, {
                          color: done ? c.text : c.textMuted,
                          fontWeight: active ? '700' : '400',
                        }]}>
                          {step.label}
                        </Text>
                        {i < STATUS_STEPS.length - 1 && (
                          <View style={[styles.stepLine, {
                            backgroundColor: i < stepIndex ? c.primary : c.borderLight,
                          }]} />
                        )}
                      </View>
                    );
                  })}
                </View>

                {/* Driver info */}
                <View style={[styles.driverCard, { backgroundColor: c.surfaceSecondary }]}>
                  <View style={styles.driverLeft}>
                    <Text style={styles.driverEmoji}>🧑‍✈️</Text>
                    <View>
                      <Text style={[styles.driverName, { color: c.text }]}>
                        {delivery.driver_name}
                      </Text>
                      <Text style={[styles.driverVehicle, { color: c.textMuted }]}>
                        {delivery.vehicle_type} · {delivery.vehicle_number}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={[styles.callBtn, { backgroundColor: c.primary }]}
                    onPress={() => callDriver(delivery.driver_mobile)}
                  >
                    <Text style={styles.callBtnText}>📞 Call</Text>
                  </TouchableOpacity>
                </View>

                {/* Location info */}
                {delivery.last_known_lat && (
                  <View style={[styles.locationRow, { borderTopColor: c.borderLight }]}>
                    <Text style={styles.locationIcon}>📡</Text>
                    <Text style={[styles.locationText, { color: c.textMuted }]}>
                      Last location updated:{' '}
                      {delivery.last_location_at
                        ? new Date(delivery.last_location_at).toLocaleTimeString('en-IN')
                        : 'Unknown'}
                    </Text>
                  </View>
                )}

                {/* Instructions */}
                {delivery.delivery_instructions && (
                  <View style={[styles.instructionsRow, { borderTopColor: c.borderLight }]}>
                    <Text style={styles.instructionsIcon}>📋</Text>
                    <Text style={[styles.instructionsText, { color: c.textMuted }]}>
                      {delivery.delivery_instructions}
                    </Text>
                  </View>
                )}

                {/* Action buttons */}
                <View style={[styles.cardActions, { borderTopColor: c.borderLight }]}>
                  {delivery.order_status === 'packing' && (
                    <TouchableOpacity
                      style={[styles.dispatchBtn, { backgroundColor: c.primary }]}
                      onPress={() => dispatchOrder(delivery.sub_order_id)}
                    >
                      <Text style={styles.dispatchBtnText}>🚚 Mark as Dispatched</Text>
                    </TouchableOpacity>
                  )}
                  {delivery.order_status === 'dispatched' && (
                    <View style={[styles.dispatchedInfo, { backgroundColor: '#2A1F00' }]}>
                      <Text style={styles.dispatchedIcon}>🚚</Text>
                      <Text style={[styles.dispatchedText, { color: '#F2C94C' }]}>
                        Out for delivery · Driver en route
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })
        )}
        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: { padding: 20, paddingTop: 48 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#FFFFFF' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 3 },

  card: {
    marginHorizontal: 16, marginTop: 14,
    borderRadius: 16, elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 6,
    overflow: 'hidden',
  },

  // Card header
  cardHeader: { padding: 14, borderBottomWidth: 0.5 },
  retailerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  avatar: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  retailerInfo: { flex: 1 },
  retailerName: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  retailerAddress: { fontSize: 11 },
  statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  amount: { fontSize: 18, fontWeight: '800' },

  // Steps
  stepsContainer: {
    flexDirection: 'row', padding: 16,
    justifyContent: 'space-between', alignItems: 'flex-start',
  },
  stepWrapper: { alignItems: 'center', flex: 1, position: 'relative' },
  stepCircle: {
    width: 32, height: 32, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 6,
  },
  stepIcon: { color: '#FFFFFF' },
  stepLabel: { fontSize: 9, textAlign: 'center' },
  stepLine: {
    position: 'absolute', top: 16, left: '60%',
    right: '-60%', height: 2,
  },

  // Driver
  driverCard: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    margin: 14, marginTop: 0,
    borderRadius: 12, padding: 12,
  },
  driverLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  driverEmoji: { fontSize: 24 },
  driverName: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  driverVehicle: { fontSize: 11 },
  callBtn: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  callBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },

  // Location
  locationRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10,
    borderTopWidth: 0.5, gap: 8,
  },
  locationIcon: { fontSize: 14 },
  locationText: { fontSize: 12, flex: 1 },

  // Instructions
  instructionsRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingHorizontal: 14, paddingVertical: 10,
    borderTopWidth: 0.5, gap: 8,
  },
  instructionsIcon: { fontSize: 14 },
  instructionsText: { fontSize: 12, flex: 1, lineHeight: 18 },

  // Actions
  cardActions: { padding: 14, borderTopWidth: 0.5 },
  dispatchBtn: {
    borderRadius: 12, paddingVertical: 12,
    alignItems: 'center',
  },
  dispatchBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  dispatchedInfo: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 12, padding: 12, gap: 10,
  },
  dispatchedIcon: { fontSize: 20 },
  dispatchedText: { fontSize: 13, fontWeight: '600' },

  // Empty
  empty: { alignItems: 'center', marginTop: 80, paddingHorizontal: 32 },
  emptyEmoji: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  goBtn: { borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  goBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});