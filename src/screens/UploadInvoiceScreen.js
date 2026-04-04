import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, ScrollView
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import api from '../services/api';

export default function UploadInvoiceScreen({ route, navigation }) {
  const { subOrder } = route.params;
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [invoiceAmount, setInvoiceAmount] = useState(
    parseFloat(subOrder.total_amount).toString()
  );
  const [gstinWholesaler, setGstinWholesaler] = useState('');
  const [gstinRetailer, setGstinRetailer] = useState('');
  const [hsnCode, setHsnCode] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    loadProfiles();
  }, []);

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
        copyToCacheDirectory: true
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
        allowsEditing: false
      });
      if (!result.canceled && result.assets?.length > 0) {
        const asset = result.assets[0];
        setSelectedFile({
          uri: asset.uri,
          name: `invoice_${Date.now()}.jpg`,
          size: asset.fileSize || 500000,
          mimeType: 'image/jpeg'
        });
      }
    } catch (err) {
      Alert.alert('Error', 'Could not open camera');
    }
  };

  const uploadInvoice = async () => {
    if (!invoiceNumber) {
      Alert.alert('Error', 'Enter invoice number');
      return;
    }
    if (!gstinWholesaler) {
      Alert.alert('Error', 'Enter your GSTIN');
      return;
    }

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
        file_size_kb: selectedFile ? Math.round(selectedFile.size / 1024) : 100
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
    <View style={styles.loading}>
      <ActivityIndicator size="large" color="#0F6E56" />
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Upload Invoice</Text>
        <Text style={styles.subtitle}>
          Order: {subOrder.sub_order_id.slice(0, 8).toUpperCase()}
        </Text>
        <Text style={styles.amount}>
          ₹{parseFloat(subOrder.total_amount).toLocaleString('en-IN')}
        </Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Invoice Number</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. INV-2026-001"
          value={invoiceNumber}
          onChangeText={setInvoiceNumber}
        />

        <Text style={styles.label}>Invoice Date</Text>
        <TextInput
          style={styles.input}
          placeholder="YYYY-MM-DD"
          value={invoiceDate}
          onChangeText={setInvoiceDate}
        />

        <Text style={styles.label}>Invoice Amount (₹)</Text>
        <TextInput
          style={styles.input}
          placeholder="Amount"
          keyboardType="numeric"
          value={invoiceAmount}
          onChangeText={setInvoiceAmount}
        />

        <Text style={styles.label}>Your GSTIN</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 33ABCDE1234F1Z2"
          value={gstinWholesaler}
          onChangeText={setGstinWholesaler}
          autoCapitalize="characters"
          maxLength={15}
        />

        <Text style={styles.label}>Retailer GSTIN</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 33XYZAB5678G2H3"
          value={gstinRetailer}
          onChangeText={setGstinRetailer}
          autoCapitalize="characters"
          maxLength={15}
        />

        <Text style={styles.label}>HSN Code</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 2523"
          value={hsnCode}
          onChangeText={setHsnCode}
          keyboardType="numeric"
        />

        <Text style={styles.label}>Invoice File (PDF/Image)</Text>
        <View style={styles.fileButtons}>
          <TouchableOpacity style={styles.fileBtn} onPress={pickFile}>
            <Text style={styles.fileBtnIcon}>📄</Text>
            <Text style={styles.fileBtnText}>Pick File</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.fileBtn} onPress={takePhoto}>
            <Text style={styles.fileBtnIcon}>📷</Text>
            <Text style={styles.fileBtnText}>Take Photo</Text>
          </TouchableOpacity>
        </View>
        {selectedFile && (
          <Text style={styles.fileSelected}>
            Selected: {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)
          </Text>
        )}

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            After submitting, the retailer will be notified and can download the invoice from their app.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.btn}
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
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { backgroundColor: '#0F6E56', padding: 20, paddingTop: 48 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  subtitle: { fontSize: 13, color: '#9FE1CB', marginTop: 4 },
  amount: { fontSize: 18, fontWeight: '600', color: '#fff', marginTop: 6 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  form: { padding: 16 },
  label: { fontSize: 14, fontWeight: '500', color: '#333', marginBottom: 6, marginTop: 14 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, backgroundColor: '#fff', paddingHorizontal: 14, height: 48, fontSize: 15 },
  fileButtons: { flexDirection: 'row', gap: 10 },
  fileBtn: { flex: 1, borderWidth: 1, borderColor: '#0F6E56', borderRadius: 10, borderStyle: 'dashed', padding: 14, alignItems: 'center', backgroundColor: '#fff' },
  fileBtnIcon: { fontSize: 24, marginBottom: 4 },
  fileBtnText: { color: '#0F6E56', fontSize: 13, fontWeight: '500' },
  fileSelected: { fontSize: 12, color: '#27500A', marginTop: 6, backgroundColor: '#EAF3DE', padding: 8, borderRadius: 6 },
  infoBox: { backgroundColor: '#E1F5EE', borderRadius: 8, padding: 12, marginTop: 16 },
  infoText: { fontSize: 12, color: '#085041', lineHeight: 18 },
  btn: { backgroundColor: '#0F6E56', borderRadius: 12, height: 52, justifyContent: 'center', alignItems: 'center', marginTop: 24, marginBottom: 32 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' }
});