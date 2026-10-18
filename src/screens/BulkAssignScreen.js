import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, Alert, ActivityIndicator, ScrollView, Modal
} from 'react-native';
import api from '../services/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

export default function BulkAssignScreen({ route, navigation }) {
  const preSelectedOrder = route.params?.subOrder || null;

  const [driverQuery, setDriverQuery] = useState('');
  const [driverResults, setDriverResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [driver, setDriver] = useState(null);
  const searchTimeout = useRef(null);

  const [showAddDriver, setShowAddDriver] = useState(false);
  const [newDriverMobile, setNewDriverMobile] = useState('');
  const [newDriverName, setNewDriverName] = useState('');
  const [addingDriver, setAddingDriver] = useState(false);

  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('Mini truck');
  const [instructions, setInstructions] = useState('');

  const [orders, setOrders] = useState([]);
  const [selected, setSelected] = useState(
    preSelectedOrder ? new Set([preSelectedOrder.sub_order_id]) : new Set()
  );
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const { theme } = useTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();

  const loadOrders = useCallback(async () => {
    setLoadingOrders(true);
    try {
      const [acceptedRes, partialRes, packingRes] = await Promise.all([
        api.get('/orders/wholesaler/all', { params: { status: 'accepted', limit: 100 } }),
        api.get('/orders/wholesaler/all', { params: { status: 'partially_accepted', limit: 100 } }),
        api.get('/orders/wholesaler/all', { params: { status: 'packing', limit: 100 } }),
      ]);
      const packingNoDriver = (packingRes.data.sub_orders || []).filter(o => !o.driver_name);
      const merged = [...(acceptedRes.data.sub_orders || []), ...(partialRes.data.sub_orders || []), ...packingNoDriver];
      setOrders(merged);
    } catch (err) {
      console.error('Failed to load orders:', err.message);
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  // Live autocomplete search as user types (4+ digits)
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (driverQuery.length < 4) {
      setDriverResults([]);
      return;
    }

    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.get('/users/drivers/search', { params: { q: driverQuery } });
        setDriverResults(res.data.drivers || []);
      } catch (err) {
        setDriverResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(searchTimeout.current);
  }, [driverQuery]);

  const selectDriver = (d) => {
    setDriver(d);
    setDriverQuery(`${d.name} (${d.mobile})`);
    setDriverResults([]);
  };

  const openAddDriver = () => {
    setNewDriverMobile(driverQuery.replace(/\D/g, '').slice(0, 10));
    setNewDriverName('');
    setShowAddDriver(true);
  };

  const submitAddDriver = async () => {
    if (!newDriverMobile || newDriverMobile.length !== 10) {
      Alert.alert('Error', 'Enter a valid 10 digit mobile number');
      return;
    }
    if (!newDriverName) {
      Alert.alert('Error', "Enter the driver's name");
      return;
    }
    setAddingDriver(true);
    try {
      const res = await api.post('/users/drivers', { mobile: newDriverMobile, name: newDriverName });
      setShowAddDriver(false);
      selectDriver(res.data.user);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to add driver');
    } finally {
      setAddingDriver(false);
    }
  };

  const toggleOrder = (subOrderId) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(subOrderId)) next.delete(subOrderId);
      else next.add(subOrderId);
      return next;
    });
  };

  const submit = async () => {
    if (!driver) {
      Alert.alert('Error', 'Search and select a driver first');
      return;
    }
    if (!vehicleNumber) {
      Alert.alert('Error', 'Enter vehicle number');
      return;
    }
    if (selected.size === 0) {
      Alert.alert('Error', 'Select at least one order to assign');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/delivery/assign-bulk', {
        sub_order_ids: Array.from(selected),
        driver_id: driver.user_id,
        vehicle_number: vehicleNumber,
        vehicle_type: vehicleType,
        delivery_instructions: instructions,
      });

      const skippedCount = res.data.skipped?.length || 0;
      const msg = skippedCount > 0
        ? `${res.data.assigned.length} order(s) assigned. ${skippedCount} skipped (already assigned or not eligible).`
        : `${res.data.assigned.length} order(s) assigned successfully.`;

      Alert.alert('Success', msg, [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (err) {
      console.error('ASSIGN SUBMIT ERROR:', err.message, err.response?.data, err.response?.status);
      console.error('ASSIGN SUBMIT ERROR:', err.message, err.response?.data, err.response?.status);
      Alert.alert('Error', err.response?.data?.error || 'Failed to assign driver');
    } finally {
      setSubmitting(false);
    }
  };

  const renderOrder = ({ item }) => {
    const isSelected = selected.has(item.sub_order_id);
    return (
      <TouchableOpacity
        style={[styles.orderRow, {
          backgroundColor: isSelected ? c.primaryLight : c.surface,
          borderColor: isSelected ? c.primary : c.border,
        }]}
        onPress={() => toggleOrder(item.sub_order_id)}
      >
        <View style={[styles.checkbox, { borderColor: c.primary, backgroundColor: isSelected ? c.primary : 'transparent' }]}>
          {isSelected && <Text style={styles.checkmark}>✓</Text>}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.orderRetailer, { color: c.text }]}>{item.retailer_name}</Text>
          <Text style={[styles.orderAddress, { color: c.textMuted }]} numberOfLines={1}>
            {item.retailer_address}
          </Text>
        </View>
        <Text style={[styles.orderAmount, { color: c.primary }]}>
          ₹{parseFloat(item.total_amount || 0).toLocaleString('en-IN')}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <View style={[styles.header, { backgroundColor: c.primary }]}>
        <Text style={styles.title}>Assign Deliveries</Text>
        <Text style={styles.subtitle}>Pick a driver, then select orders to assign</Text>
      </View>

      <ScrollView style={styles.form} contentContainerStyle={{ paddingBottom: 8 }} keyboardShouldPersistTaps="handled">
        <Text style={[styles.label, { color: c.textSecondary }]}>Driver</Text>
        <TextInput
          style={[styles.input, { backgroundColor: c.inputBackground, borderColor: c.border, color: c.text }]}
          placeholder="Type mobile number (min 4 digits)"
          placeholderTextColor={c.placeholder}
          value={driverQuery}
          onChangeText={(v) => { setDriverQuery(v); setDriver(null); }}
        />

        {searching && <ActivityIndicator style={{ marginTop: 8 }} color={c.primary} size="small" />}

        {!driver && driverQuery.length >= 4 && !searching && (
          <View style={styles.resultsBox}>
            {driverResults.map((d) => (
              <TouchableOpacity
                key={d.user_id}
                style={[styles.resultRow, { borderBottomColor: c.border }]}
                onPress={() => selectDriver(d)}
              >
                <Text style={{ color: c.text }}>{d.name} ({d.mobile})</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.addNewRow} onPress={openAddDriver}>
              <Text style={{ color: c.primary, fontWeight: '600' }}>+ Add New Driver</Text>
            </TouchableOpacity>
          </View>
        )}

        {driver && (
          <View style={[styles.driverConfirmed, { backgroundColor: c.primaryLight }]}>
            <Text style={{ color: c.primary, fontWeight: '600' }}>✓ {driver.name} ({driver.mobile})</Text>
          </View>
        )}

        <Text style={[styles.label, { color: c.textSecondary }]}>Vehicle Number</Text>
        <TextInput
          style={[styles.textInput, { backgroundColor: c.inputBackground, borderColor: c.border, color: c.text }]}
          placeholder="e.g. TN59AB1234"
          placeholderTextColor={c.placeholder}
          value={vehicleNumber}
          onChangeText={setVehicleNumber}
          autoCapitalize="characters"
        />

        <Text style={[styles.label, { color: c.textSecondary }]}>Vehicle Type</Text>
        <View style={styles.vehicleTypes}>
          {['Mini truck', 'Large truck', 'Auto', 'Bike'].map(type => (
            <TouchableOpacity
              key={type}
              style={[styles.typeBtn, {
                backgroundColor: vehicleType === type ? c.primary : c.surface,
                borderColor: vehicleType === type ? c.primary : c.border,
              }]}
              onPress={() => setVehicleType(type)}
            >
              <Text style={{ color: vehicleType === type ? '#fff' : c.text, fontSize: 13 }}>{type}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.label, { color: c.textSecondary }]}>Delivery Instructions (optional)</Text>
        <TextInput
          style={[styles.textInput, styles.textarea, { backgroundColor: c.inputBackground, borderColor: c.border, color: c.text }]}
          placeholder="e.g. Call retailer 20 mins before arrival"
          placeholderTextColor={c.placeholder}
          value={instructions}
          onChangeText={setInstructions}
          multiline
          numberOfLines={3}
        />

        <Text style={[styles.label, { color: c.textSecondary, marginTop: 20 }]}>
          Select Orders ({selected.size} selected)
        </Text>

        {loadingOrders ? (
          <ActivityIndicator style={{ marginTop: 20 }} color={c.primary} />
        ) : orders.length === 0 ? (
          <Text style={{ color: c.textMuted, marginTop: 12 }}>No accepted orders available for assignment.</Text>
        ) : (
          <FlatList
            data={orders}
            renderItem={renderOrder}
            keyExtractor={item => item.sub_order_id}
            scrollEnabled={false}
          />
        )}
      </ScrollView>

      <TouchableOpacity
        style={[styles.submitBtn, { backgroundColor: c.primary, marginBottom: insets.bottom + 16 }]}
        onPress={submit}
        disabled={submitting}
      >
        {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Assign {selected.size} Order(s)</Text>}
      </TouchableOpacity>

      <Modal visible={showAddDriver} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: c.surface }]}>
            <Text style={[styles.modalTitle, { color: c.text }]}>Add New Driver</Text>

            <Text style={[styles.label, { color: c.textSecondary }]}>Mobile Number</Text>
            <TextInput
              style={[styles.input, { backgroundColor: c.inputBackground, borderColor: c.border, color: c.text }]}
              placeholder="10 digit mobile number"
              placeholderTextColor={c.placeholder}
              keyboardType="numeric"
              maxLength={10}
              value={newDriverMobile}
              onChangeText={setNewDriverMobile}
            />

            <Text style={[styles.label, { color: c.textSecondary }]}>Driver Name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: c.inputBackground, borderColor: c.border, color: c.text }]}
              placeholder="Full name"
              placeholderTextColor={c.placeholder}
              value={newDriverName}
              onChangeText={setNewDriverName}
            />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: c.border }]}
                onPress={() => setShowAddDriver(false)}
              >
                <Text style={{ color: c.text }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: c.primary }]}
                onPress={submitAddDriver}
                disabled={addingDriver}
              >
                {addingDriver ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ color: '#fff', fontWeight: '600' }}>Add Driver</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, paddingTop: 48 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  subtitle: { fontSize: 13, color: '#9FE1CB', marginTop: 4 },
  form: { flex: 1, padding: 16 },
  label: { fontSize: 14, fontWeight: '500', marginBottom: 8, marginTop: 14 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, height: 48, fontSize: 15 },
  resultsBox: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, marginTop: 6, overflow: 'hidden' },
  resultRow: { padding: 12, borderBottomWidth: 1 },
  addNewRow: { padding: 12 },
  driverConfirmed: { borderRadius: 8, padding: 10, marginTop: 8 },
  textInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, height: 48, fontSize: 15 },
  textarea: { height: 80, textAlignVertical: 'top', paddingTop: 12 },
  vehicleTypes: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeBtn: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  orderRow: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1,
    borderRadius: 10, padding: 12, marginBottom: 8,
  },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  checkmark: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  orderRetailer: { fontSize: 14, fontWeight: '600' },
  orderAddress: { fontSize: 12, marginTop: 2 },
  orderAmount: { fontSize: 14, fontWeight: '700' },
  submitBtn: {
    margin: 16, borderRadius: 12, height: 52,
    justifyContent: 'center', alignItems: 'center',
  },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  modalBox: { borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  modalBtn: { flex: 1, borderRadius: 10, height: 46, justifyContent: 'center', alignItems: 'center' },
});
