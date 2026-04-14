import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, ScrollView
} from 'react-native';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';

export default function AssignDriverScreen({ route, navigation }) {
  const { subOrder } = route.params;
  const [driverMobile, setDriverMobile] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('Mini truck');
  const [instructions, setInstructions] = useState('');
  const [loading, setLoading] = useState(false);
  const { theme } = useTheme();
  const c = theme.colors;

  const assignDriver = async () => {
    if (!driverMobile || driverMobile.length !== 10) {
      Alert.alert('Error', 'Enter valid driver mobile number');
      return;
    }
    if (!vehicleNumber) {
      Alert.alert('Error', 'Enter vehicle number');
      return;
    }
    setLoading(true);
    try {
      const driverRes = await api.get(`/users/by-mobile/${driverMobile}`);
      const driverId = driverRes.data.user.user_id;
      await api.post('/delivery/assign', {
        sub_order_id: subOrder.sub_order_id,
        driver_id: driverId,
        vehicle_number: vehicleNumber,
        vehicle_type: vehicleType,
        delivery_instructions: instructions
      });
      Alert.alert('Success', 'Driver assigned successfully', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to assign driver');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: c.background }]}>

      {/* Header */}
      <View style={[styles.header, { backgroundColor: c.primary }]}>
        <Text style={styles.title}>Assign Driver</Text>
        <Text style={styles.subtitle}>
          Order: {subOrder.sub_order_id.slice(0, 8).toUpperCase()}
        </Text>
      </View>

      <View style={styles.form}>

        {/* Driver Mobile */}
        <Text style={[styles.label, { color: c.textSecondary }]}>
          Driver Mobile Number
        </Text>
        <View style={[styles.inputRow, {
          backgroundColor: c.inputBackground, borderColor: c.border,
        }]}>
          <Text style={[styles.prefix, { color: c.text }]}>+91</Text>
          <TextInput
            style={[styles.input, { color: c.text }]}
            placeholder="Driver mobile number"
            placeholderTextColor={c.placeholder}
            keyboardType="numeric"
            maxLength={10}
            value={driverMobile}
            onChangeText={setDriverMobile}
          />
        </View>

        {/* Vehicle Number */}
        <Text style={[styles.label, { color: c.textSecondary }]}>Vehicle Number</Text>
        <TextInput
          style={[styles.textInput, {
            backgroundColor: c.inputBackground,
            borderColor: c.border, color: c.text,
          }]}
          placeholder="e.g. TN59AB1234"
          placeholderTextColor={c.placeholder}
          value={vehicleNumber}
          onChangeText={setVehicleNumber}
          autoCapitalize="characters"
        />

        {/* Vehicle Type */}
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
              <Text style={[styles.typeBtnText, {
                color: vehicleType === type ? '#fff' : c.text,
              }]}>
                {type}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Instructions */}
        <Text style={[styles.label, { color: c.textSecondary }]}>
          Delivery Instructions (optional)
        </Text>
        <TextInput
          style={[styles.textInput, styles.textarea, {
            backgroundColor: c.inputBackground,
            borderColor: c.border, color: c.text,
          }]}
          placeholder="e.g. Call retailer 20 mins before arrival"
          placeholderTextColor={c.placeholder}
          value={instructions}
          onChangeText={setInstructions}
          multiline
          numberOfLines={3}
        />

        <TouchableOpacity
          style={[styles.btn, { backgroundColor: c.primary }]}
          onPress={assignDriver}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>Assign Driver</Text>
          }
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, paddingTop: 48 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  subtitle: { fontSize: 13, color: '#9FE1CB', marginTop: 4 },
  form: { padding: 16 },
  label: { fontSize: 14, fontWeight: '500', marginBottom: 8, marginTop: 16 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 12,
  },
  prefix: { fontSize: 16, marginRight: 8 },
  input: { flex: 1, height: 48, fontSize: 16 },
  textInput: {
    borderWidth: 1, borderRadius: 10,
    paddingHorizontal: 14, height: 48, fontSize: 15,
  },
  textarea: { height: 90, textAlignVertical: 'top', paddingTop: 12 },
  vehicleTypes: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeBtn: {
    borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  typeBtnText: { fontSize: 13, fontWeight: '500' },
  btn: {
    borderRadius: 12, height: 52,
    justifyContent: 'center', alignItems: 'center',
    marginTop: 24, marginBottom: 32,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});