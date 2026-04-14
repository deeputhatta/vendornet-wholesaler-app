import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, ScrollView
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';

export default function UploadInvoiceScreen({ route, navigation }) {
  const { subOrder } = route.params;
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceAmount, setInvoiceAmount] = useState(parseFloat(subOrder.total_amount).toString());
  const [gstinWholesaler, setGstinWholesaler] = useState('');
  const [gstinRetailer, setGstinRetailer] = useState('');
  const [hsnCode, setHsnCode] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const { theme } = useTheme();
  const c = theme.colors;

  useEffect(() => { loadProfiles(); }, []);

  const loadProfiles = async () => {
    try {
      const myProfile = await api.get('/users/me');
      setGstinWholesaler(myProfile.data.user.gstin || '');
      const orderRes = await api.get(`/orders/sub/${subOrder.sub_order_id}`);
      setGstinRetailer(orderRes.data.retailer_gstin || '');
    } catch (err) {
      console.log('Profile load error:', err.message);
    } finally {
      setLoadingProfile(false);
    }
  };

  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/jpeg', 'image/png'],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets?.length > 0) {
        setSelectedFile(result.assets[0]);
      }
    } catch (err) {
      Alert.alert('Error', 'Could not pick file');
    }
  };

  const takePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Camera permission is required');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.length > 0) {
        const asset = result.assets[0];
        setSelectedFile({
          uri: asset.uri,
          name: `invoice_${Date.now()}.jpg`,
          size: asset.fileSize || 500000,
          mimeType: 'image/jpeg',
        });
      }
    } catch (err) {
      Alert.alert('Error', 'Could not open camera');
    }
  };

  const uploadInvoice = async () => {
    if (!invoiceNumber) { Alert.alert('Error', 'Enter invoice number'); return; }
    if (!gstinWholesaler) { Alert.alert('Error', 'Enter your GSTIN'); return; }
    setLoading(true);
    try {
      await api.post('/invoices', {
        sub_order_id: subOrder.sub_order_id,
        invoice_number: invoiceNumber,
        invoice_date: invoiceDate,
        invoice_amount: parseFloat(invoiceAmount),
        gstin_wholesaler: gstinWholesaler,
        gstin_retailer: gstinRetailer,
        hsn_code: hsnCode,
        file_url: selectedFile
          ? `invoices/${subOrder.sub_order_id}/${invoiceNumber}.${selectedFile.name.split('.').pop()}`
          : `invoices/${subOrder.sub_order_id}/${invoiceNumber}.pdf`,
        file_type: selectedFile
          ? selectedFile.mimeType?.includes('pdf') ? 'pdf' : 'jpg'
          : 'pdf',
        file_size_kb: selectedFile ? Math.round(selectedFile.size / 1024) : 100,
      });
      Alert.alert('Success', 'Invoice uploaded — retailer notified', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to upload invoice');
    } finally {
      setLoading(false);
    }
  };

  if (loadingProfile) return (
    <View style={[styles.loading, { backgroundColor: c.background }]}>
      <ActivityIndicator size="large" color={c.primary} />
    </View>
  );

  return (
    <ScrollView style={[styles.container, { backgroundColor: c.background }]}>

      {/* Header */}
      <View style={[styles.header, { backgroundColor: c.primary }]}>
        <Text style={styles.title}>Upload Invoice</Text>
        <Text style={styles.subtitle}>
          Order: {subOrder.sub_order_id.slice(0, 8).toUpperCase()}
        </Text>
        <Text style={styles.headerAmount}>
          ₹{parseFloat(subOrder.total_amount).toLocaleString('en-IN')}
        </Text>
      </View>

      <View style={styles.form}>

        {[
          { label: 'Invoice Number', value: invoiceNumber, set: setInvoiceNumber, placeholder: 'e.g. INV-2026-001' },
          { label: 'Invoice Date', value: invoiceDate, set: setInvoiceDate, placeholder: 'YYYY-MM-DD' },
          { label: 'Invoice Amount (₹)', value: invoiceAmount, set: setInvoiceAmount, placeholder: 'Amount', keyboard: 'numeric' },
          { label: 'Your GSTIN', value: gstinWholesaler, set: setGstinWholesaler, placeholder: 'e.g. 33ABCDE1234F1Z2', caps: 'characters', max: 15 },
          { label: 'Retailer GSTIN', value: gstinRetailer, set: setGstinRetailer, placeholder: 'e.g. 33XYZAB5678G2H3', caps: 'characters', max: 15 },
          { label: 'HSN Code', value: hsnCode, set: setHsnCode, placeholder: 'e.g. 2523', keyboard: 'numeric' },
        ].map(({ label, value, set, placeholder, keyboard, caps, max }) => (
          <View key={label}>
            <Text style={[styles.label, { color: c.textSecondary }]}>{label}</Text>
            <TextInput
              style={[styles.input, {
                backgroundColor: c.inputBackground,
                borderColor: c.border, color: c.text,
              }]}
              placeholder={placeholder}
              placeholderTextColor={c.placeholder}
              value={value}
              onChangeText={set}
              keyboardType={keyboard || 'default'}
              autoCapitalize={caps || 'none'}
              maxLength={max}
            />
          </View>
        ))}

        {/* File picker */}
        <Text style={[styles.label, { color: c.textSecondary }]}>
          Invoice File (PDF/Image)
        </Text>
        <View style={styles.fileButtons}>
          <TouchableOpacity
            style={[styles.fileBtn, { borderColor: c.primary, backgroundColor: c.surface }]}
            onPress={pickFile}
          >
            <Text style={styles.fileBtnIcon}>📄</Text>
            <Text style={[styles.fileBtnText, { color: c.primary }]}>Pick File</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.fileBtn, { borderColor: c.primary, backgroundColor: c.surface }]}
            onPress={takePhoto}
          >
            <Text style={styles.fileBtnIcon}>📷</Text>
            <Text style={[styles.fileBtnText, { color: c.primary }]}>Take Photo</Text>
          </TouchableOpacity>
        </View>
        {selectedFile && (
          <View style={[styles.fileSelected, { backgroundColor: c.primaryLight }]}>
            <Text style={[styles.fileSelectedText, { color: c.primary }]}>
              ✓ {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)
            </Text>
          </View>
        )}

        {/* Info box */}
        <View style={[styles.infoBox, { backgroundColor: c.primaryLight }]}>
          <Text style={[styles.infoText, { color: c.primary }]}>
            ℹ️ After submitting, the retailer will be notified and can download the invoice from their app.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.btn, { backgroundColor: c.primary }]}
          onPress={uploadInvoice}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>Submit Invoice</Text>
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
  headerAmount: { fontSize: 18, fontWeight: '700', color: '#fff', marginTop: 6 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  form: { padding: 16 },
  label: { fontSize: 14, fontWeight: '500', marginBottom: 6, marginTop: 14 },
  input: {
    borderWidth: 1, borderRadius: 10,
    paddingHorizontal: 14, height: 48, fontSize: 15,
  },
  fileButtons: { flexDirection: 'row', gap: 10 },
  fileBtn: {
    flex: 1, borderWidth: 1.5, borderRadius: 10,
    borderStyle: 'dashed', padding: 14, alignItems: 'center',
  },
  fileBtnIcon: { fontSize: 24, marginBottom: 4 },
  fileBtnText: { fontSize: 13, fontWeight: '500' },
  fileSelected: {
    borderRadius: 8, padding: 10, marginTop: 8,
  },
  fileSelectedText: { fontSize: 13, fontWeight: '500' },
  infoBox: { borderRadius: 10, padding: 14, marginTop: 16 },
  infoText: { fontSize: 13, lineHeight: 20 },
  btn: {
    borderRadius: 12, height: 52,
    justifyContent: 'center', alignItems: 'center',
    marginTop: 24, marginBottom: 32,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});