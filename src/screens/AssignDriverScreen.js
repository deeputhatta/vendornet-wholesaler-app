import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, ScrollView
} from 'react-native';
import api from '../services/api';

export default function AssignDriverScreen({ route, navigation }) {
  const { subOrder } = route.params;
  const [driverMobile, setDriverMobile] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('Mini truck');
  const [instructions, setInstructions] = useState('');
  const [loading, setLoading] = useState(false);

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
      // First get driver user_id from mobile
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
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Assign Driver</Text>
        <Text style={styles.subtitle}>
          Order: {subOrder.sub_order_id.slice(0, 8).toUpperCase()}
        </Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Driver Mobile Number</Text>
        <View style={styles.inputRow}>
          <Text style={styles.prefix}>+91</Text>
          <TextInput
            style={styles.input}
            placeholder="Driver mobile number"
            keyboardType="numeric"
            maxLength={10}
            value={driverMobile}
            onChangeText={setDriverMobile}
          />
        </View>

        <Text style={styles.label}>Vehicle Number</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g. TN59AB1234"
          value={vehicleNumber}
          onChangeText={setVehicleNumber}
          autoCapitalize="characters"
        />

        <Text style={styles.label}>Vehicle Type</Text>
        <View style={styles.vehicleTypes}>
          {['Mini truck', 'Large truck', 'Auto', 'Bike'].map(type => (
            <TouchableOpacity
              key={type}
              style={[styles.typeBtn, vehicleType === type && styles.typeBtnActive]}
              onPress={() => setVehicleType(type)}
            >
              <Text style={[styles.typeBtnText, vehicleType === type && styles.typeBtnTextActive]}>
                {type}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Delivery Instructions (optional)</Text>
        <TextInput
          style={[styles.textInput, styles.textarea]}
          placeholder="e.g. Call retailer 20 mins before arrival"
          value={instructions}
          onChangeText={setInstructions}
          multiline
          numberOfLines={3}
        />

        <TouchableOpacity
          style={styles.btn}
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
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { backgroundColor: '#0F6E56', padding: 20, paddingTop: 48 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  subtitle: { fontSize: 13, color: '#9FE1CB', marginTop: 4 },
  form: { padding: 16 },
  label: { fontSize: 14, fontWeight: '500', color: '#333', marginBottom: 8, marginTop: 16 },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#ddd', borderRadius: 10, backgroundColor: '#fff', paddingHorizontal: 12 },
  prefix: { fontSize: 16, color: '#333', marginRight: 8 },
  input: { flex: 1, height: 48, fontSize: 16 },
  textInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, backgroundColor: '#fff', paddingHorizontal: 14, height: 48, fontSize: 15 },
  textarea: { height: 90, textAlignVertical: 'top', paddingTop: 12 },
  vehicleTypes: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeBtn: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#fff' },
  typeBtnActive: { backgroundColor: '#0F6E56', borderColor: '#0F6E56' },
  typeBtnText: { color: '#333', fontSize: 13 },
  typeBtnTextActive: { color: '#fff' },
  btn: { backgroundColor: '#0F6E56', borderRadius: 12, height: 52, justifyContent: 'center', alignItems: 'center', marginTop: 24, marginBottom: 32 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' }
});