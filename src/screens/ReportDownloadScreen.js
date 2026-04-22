import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Platform
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';

const CURRENT_YEAR = new Date().getFullYear();
const CURRENT_MONTH = new Date().getMonth(); // 0-indexed

// Indian FY starts April 1
const getCurrentFY = () => CURRENT_MONTH >= 3 ? CURRENT_YEAR : CURRENT_YEAR - 1;

const FY_OPTIONS = [
  { label: `FY ${getCurrentFY()}-${(getCurrentFY() + 1).toString().slice(2)}`, value: getCurrentFY() },
  { label: `FY ${getCurrentFY() - 1}-${getCurrentFY().toString().slice(2)}`, value: getCurrentFY() - 1 },
  { label: `FY ${getCurrentFY() - 2}-${(getCurrentFY() - 1).toString().slice(2)}`, value: getCurrentFY() - 2 },
];

const DATE_PRESETS = [
  { key: 'today', label: 'Today', getRange: () => { const d = new Date(); const s = d.toISOString().slice(0,10); return { from: s, to: s }; } },
  { key: 'this_week', label: 'This Week', getRange: () => { const d = new Date(); const mon = new Date(d); mon.setDate(d.getDate() - d.getDay() + 1); return { from: mon.toISOString().slice(0,10), to: d.toISOString().slice(0,10) }; } },
  { key: 'this_month', label: 'This Month', getRange: () => { const d = new Date(); return { from: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`, to: d.toISOString().slice(0,10) }; } },
  { key: 'last_month', label: 'Last Month', getRange: () => { const d = new Date(); d.setDate(0); const from = new Date(d.getFullYear(), d.getMonth(), 1); return { from: from.toISOString().slice(0,10), to: d.toISOString().slice(0,10) }; } },
  { key: 'last_3_months', label: 'Last 3 Months', getRange: () => { const to = new Date(); const from = new Date(); from.setMonth(from.getMonth()-3); return { from: from.toISOString().slice(0,10), to: to.toISOString().slice(0,10) }; } },
  { key: 'custom', label: '📅 Custom' },
];

const FIELD_OPTIONS = [
  { key: 'order',    label: 'Order IDs',      icon: '🔢', desc: 'Order & Sub-order ID' },
  { key: 'retailer', label: 'Retailer Info',   icon: '🏪', desc: 'Name, mobile, address' },
  { key: 'amount',   label: 'Amount',          icon: '💰', desc: 'Total order value' },
  { key: 'status',   label: 'Order Status',    icon: '📋', desc: 'Pending, delivered etc' },
  { key: 'items',    label: 'Product Items',   icon: '📦', desc: 'Products, qty, price' },
  { key: 'dates',    label: 'Dates',           icon: '📅', desc: 'Order, invoice, POD dates' },
];

export default function ReportDownloadScreen() {
  const { theme } = useTheme();
  const c = theme.colors;

  const [dateMode, setDateMode] = useState('preset'); // preset | fy | custom
  const [selectedPreset, setSelectedPreset] = useState('this_month');
  const [selectedFY, setSelectedFY] = useState(getCurrentFY());
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [selectedFields, setSelectedFields] = useState(['order', 'retailer', 'amount', 'status', 'dates']);
  const [downloading, setDownloading] = useState(false);

  const toggleField = (key) => {
    setSelectedFields(prev =>
      prev.includes(key) ? prev.filter(f => f !== key) : [...prev, key]
    );
  };

  const getDateParams = () => {
    if (dateMode === 'fy') return { fy: selectedFY };
    if (dateMode === 'custom') return { from: customFrom, to: customTo };
    const preset = DATE_PRESETS.find(d => d.key === selectedPreset);
    if (preset?.getRange) {
      const { from, to } = preset.getRange();
      return { from, to };
    }
    return {};
  };

  const downloadReport = async () => {
    if (selectedFields.length === 0) return Alert.alert('Select Fields', 'Please select at least one field to include in the report');
    if (dateMode === 'custom' && !customFrom) return Alert.alert('Date Required', 'Please enter a from date');

    setDownloading(true);
    try {
      const dateParams = getDateParams();
      const params = new URLSearchParams({
        ...dateParams,
        fields: selectedFields.join(','),
      });

      const token = await AsyncStorage.getItem('token');
      const url = `${api.defaults.baseURL}/orders/wholesaler/excel-report?${params}`;

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to generate report');

      // Read as blob for binary xlsx

      const filename = `VendorNet_Report_${dateMode === 'fy' ? `FY${selectedFY}` : dateParams.from || 'all'}.xlsx`;
      const tempUri = FileSystem.cacheDirectory + filename;

      // Write xlsx binary to temp file
      const blob = await response.blob();
      const reader = new FileReader();
      const base64 = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      await FileSystem.writeAsStringAsync(tempUri, base64, { encoding: 'base64' });

      if (Platform.OS === 'android') {
        Alert.alert(
          '📊 Report Ready',
          'How would you like to save your report?',
          [
            {
              text: '📁 Save to Downloads',
              onPress: async () => {
                try {
                  const safUri = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync(
                    'content://com.android.externalstorage.documents/tree/primary%3ADownload'
                  );
                  if (safUri.granted) {
                    const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(
                      safUri.directoryUri, filename, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                    );
                    const content = await FileSystem.readAsStringAsync(tempUri, { encoding: 'base64' });
                    await FileSystem.writeAsStringAsync(fileUri, content, { encoding: 'base64' });
                    Alert.alert('✓ Saved', `${filename} saved to Downloads. Open with Excel or Google Sheets.`);
                  }
                } catch (e) {
                  await Sharing.shareAsync(tempUri, { mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', dialogTitle: 'Save Report' });
                }
              }
            },
            {
              text: '📤 Share / Open in Sheets',
              onPress: async () => {
                await Sharing.shareAsync(tempUri, { mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', dialogTitle: 'Open Report' });
              }
            },
            { text: '❌ Cancel', style: 'cancel' }
          ]
        );
      } else {
        await Sharing.shareAsync(tempUri, { mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', dialogTitle: 'Save Report' });
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to download report');
    } finally {
      setDownloading(false);
    }
  };

  const getDateSummary = () => {
    if (dateMode === 'fy') return `Financial Year ${selectedFY}-${(selectedFY + 1).toString().slice(2)}`;
    if (dateMode === 'custom') return customFrom ? `${customFrom} to ${customTo || 'today'}` : 'Select dates';
    const preset = DATE_PRESETS.find(d => d.key === selectedPreset);
    return preset?.label || 'All time';
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: c.background }]}
      contentContainerStyle={styles.content}>

      {/* Header */}
      <View style={[styles.header, { backgroundColor: c.primary }]}>
        <Text style={styles.title}>📊 Download Report</Text>
        <Text style={styles.subtitle}>Export your orders as Excel (5 sheets)</Text>
      </View>

      {/* Step 1: Date Range */}
      <View style={[styles.section, { backgroundColor: c.surface }]}>
        <Text style={[styles.sectionTitle, { color: c.text }]}>1. Select Date Range</Text>

        {/* Mode selector */}
        <View style={[styles.modeRow, { backgroundColor: c.surfaceSecondary }]}>
          {[['preset', 'Quick Select'], ['fy', 'Financial Year'], ['custom', 'Custom Dates']].map(([mode, label]) => (
            <TouchableOpacity key={mode}
              style={[styles.modeBtn, { backgroundColor: dateMode === mode ? c.primary : 'transparent' }]}
              onPress={() => setDateMode(mode)}>
              <Text style={[styles.modeBtnText, { color: dateMode === mode ? '#fff' : c.textMuted }]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Preset options */}
        {dateMode === 'preset' && (
          <View style={styles.presetGrid}>
            {DATE_PRESETS.filter(d => d.key !== 'custom').map(preset => (
              <TouchableOpacity key={preset.key}
                style={[styles.presetBtn, { backgroundColor: selectedPreset === preset.key ? c.primary : c.surfaceSecondary }]}
                onPress={() => setSelectedPreset(preset.key)}>
                <Text style={[styles.presetBtnText, { color: selectedPreset === preset.key ? '#fff' : c.textMuted }]}>{preset.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* FY options */}
        {dateMode === 'fy' && (
          <View style={styles.fyList}>
            {FY_OPTIONS.map(fy => (
              <TouchableOpacity key={fy.value}
                style={[styles.fyItem, { backgroundColor: selectedFY === fy.value ? '#0A1F35' : c.surfaceSecondary, borderColor: selectedFY === fy.value ? c.primary : 'transparent', borderWidth: 1.5 }]}
                onPress={() => setSelectedFY(fy.value)}>
                <Text style={[styles.fyLabel, { color: selectedFY === fy.value ? c.primary : c.text }]}>{fy.label}</Text>
                <Text style={[styles.fyDates, { color: c.textMuted }]}>Apr {fy.value} – Mar {fy.value + 1}</Text>
                {selectedFY === fy.value && <Text style={{ color: c.primary, fontSize: 16 }}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Custom dates */}
        {dateMode === 'custom' && (
          <View style={styles.customDates}>
            <View style={styles.dateRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.dateLabel, { color: c.textMuted }]}>From Date</Text>
                <TouchableOpacity style={[styles.dateInput, { backgroundColor: c.surfaceSecondary, borderColor: customFrom ? c.primary : c.border }]}
                  onPress={() => Alert.prompt('From Date', 'Enter date (YYYY-MM-DD)', setCustomFrom, 'plain-text', customFrom, 'numeric')}>
                  <Text style={[{ color: customFrom ? c.text : c.textMuted, fontSize: 15 }]}>{customFrom || 'YYYY-MM-DD'}</Text>
                </TouchableOpacity>
              </View>
              <Text style={[{ color: c.textMuted, fontSize: 20, alignSelf: 'flex-end', marginBottom: 8, paddingHorizontal: 8 }]}>→</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.dateLabel, { color: c.textMuted }]}>To Date</Text>
                <TouchableOpacity style={[styles.dateInput, { backgroundColor: c.surfaceSecondary, borderColor: customTo ? c.primary : c.border }]}
                  onPress={() => Alert.prompt('To Date', 'Enter date (YYYY-MM-DD)', setCustomTo, 'plain-text', customTo, 'numeric')}>
                  <Text style={[{ color: customTo ? c.text : c.textMuted, fontSize: 15 }]}>{customTo || 'YYYY-MM-DD'}</Text>
                </TouchableOpacity>
              </View>
            </View>
            {/* Quick fill buttons */}
            <View style={styles.quickFill}>
              {[
                ['Q1 (Apr-Jun)', `${selectedFY}-04-01`, `${selectedFY}-06-30`],
                ['Q2 (Jul-Sep)', `${selectedFY}-07-01`, `${selectedFY}-09-30`],
                ['Q3 (Oct-Dec)', `${selectedFY}-10-01`, `${selectedFY}-12-31`],
                ['Q4 (Jan-Mar)', `${selectedFY + 1}-01-01`, `${selectedFY + 1}-03-31`],
              ].map(([label, from, to]) => (
                <TouchableOpacity key={label} style={[styles.qBtn, { backgroundColor: c.surfaceSecondary }]}
                  onPress={() => { setCustomFrom(from); setCustomTo(to); }}>
                  <Text style={[{ color: c.textMuted, fontSize: 11 }]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Date summary */}
        <View style={[styles.dateSummary, { backgroundColor: c.primaryLight }]}>
          <Text style={[{ color: c.primary, fontSize: 13, fontWeight: '600' }]}>📅 {getDateSummary()}</Text>
        </View>
      </View>

      {/* Step 2: Select Fields */}
      <View style={[styles.section, { backgroundColor: c.surface }]}>
        <Text style={[styles.sectionTitle, { color: c.text }]}>2. Select Fields to Include</Text>
        <Text style={[styles.sectionHint, { color: c.textMuted }]}>{selectedFields.length} of {FIELD_OPTIONS.length} selected</Text>

        {FIELD_OPTIONS.map(field => {
          const selected = selectedFields.includes(field.key);
          return (
            <TouchableOpacity key={field.key}
              style={[styles.fieldRow, { borderBottomColor: c.borderLight, backgroundColor: selected ? '#0A1F35' : 'transparent' }]}
              onPress={() => toggleField(field.key)}>
              <View style={[styles.fieldCheck, { backgroundColor: selected ? c.primary : c.surfaceSecondary, borderColor: selected ? c.primary : c.border }]}>
                {selected && <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>✓</Text>}
              </View>
              <Text style={{ fontSize: 20, marginHorizontal: 10 }}>{field.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: c.text }]}>{field.label}</Text>
                <Text style={[styles.fieldDesc, { color: c.textMuted }]}>{field.desc}</Text>
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Select all / none */}
        <View style={styles.selectRow}>
          <TouchableOpacity onPress={() => setSelectedFields(FIELD_OPTIONS.map(f => f.key))}>
            <Text style={[{ color: c.primary, fontSize: 13, fontWeight: '600' }]}>Select All</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setSelectedFields([])}>
            <Text style={[{ color: c.textMuted, fontSize: 13 }]}>Clear All</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Step 3: Preview & Download */}
      <View style={[styles.section, { backgroundColor: c.surface }]}>
        <Text style={[styles.sectionTitle, { color: c.text }]}>3. Download</Text>

        <View style={[styles.previewBox, { backgroundColor: c.surfaceSecondary }]}>
          <Text style={[{ color: c.textMuted, fontSize: 12, marginBottom: 4 }]}>Report will include:</Text>
          <Text style={[{ color: c.text, fontSize: 13, fontWeight: '600' }]}>📅 {getDateSummary()}</Text>
          <Text style={[{ color: c.textMuted, fontSize: 12, marginTop: 4 }]}>
            Fields: {selectedFields.map(f => FIELD_OPTIONS.find(o => o.key === f)?.label).join(', ')}
          </Text>
          <Text style={[{ color: c.textMuted, fontSize: 11, marginTop: 4 }]}>Format: CSV (opens in Excel, Sheets)</Text>
        </View>

        <TouchableOpacity
          style={[styles.downloadBtn, { backgroundColor: selectedFields.length > 0 ? '#30D158' : c.surfaceSecondary, opacity: downloading ? 0.7 : 1 }]}
          onPress={downloadReport}
          disabled={downloading || selectedFields.length === 0}>
          {downloading ? (
            <ActivityIndicator color="#000" size="small" />
          ) : (
            <Text style={[styles.downloadBtnText, { color: selectedFields.length > 0 ? '#000' : c.textMuted }]}>
              📥 Download Excel Report
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 40 },
  header: { paddingTop: 52, paddingHorizontal: 20, paddingBottom: 20 },
  title: { fontSize: 22, fontWeight: '800', color: '#fff' },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  section: { margin: 12, borderRadius: 16, padding: 16, marginBottom: 0 },
  sectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
  sectionHint: { fontSize: 12, marginBottom: 14 },
  modeRow: { flexDirection: 'row', borderRadius: 12, padding: 3, marginBottom: 16 },
  modeBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  modeBtnText: { fontSize: 11, fontWeight: '600' },
  presetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  presetBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  presetBtnText: { fontSize: 12, fontWeight: '600' },
  fyList: { gap: 8, marginBottom: 12 },
  fyItem: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12 },
  fyLabel: { fontSize: 15, fontWeight: '700', flex: 1 },
  fyDates: { fontSize: 11, marginRight: 10 },
  customDates: { marginBottom: 12 },
  dateRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 12 },
  dateLabel: { fontSize: 11, fontWeight: '600', marginBottom: 6, textTransform: 'uppercase' },
  dateInput: { borderWidth: 1.5, borderRadius: 10, padding: 12 },
  quickFill: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  qBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  dateSummary: { borderRadius: 10, padding: 12, marginTop: 4 },
  fieldRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 0.5, borderRadius: 8, paddingHorizontal: 4, marginBottom: 2 },
  fieldCheck: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  fieldLabel: { fontSize: 14, fontWeight: '600', marginBottom: 1 },
  fieldDesc: { fontSize: 11 },
  selectRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12, marginTop: 4 },
  previewBox: { borderRadius: 12, padding: 14, marginBottom: 16 },
  downloadBtn: { borderRadius: 14, paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  downloadBtnText: { fontSize: 16, fontWeight: '800' },
});

