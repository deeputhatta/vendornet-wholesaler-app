import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import * as Location from 'expo-location';
import { authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import VendorNetLogo from '../components/VendorNetLogo';
import api from '../services/api';

const ALLOWED_ROLES = ['wholesaler_admin', 'wholesaler_staff'];

const validateGSTIN = (gstin) => {
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return gstinRegex.test(gstin.toUpperCase());
};

export default function LoginScreen() {
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('mobile');
  const [loading, setLoading] = useState(false);

  // Registration fields
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [gstin, setGstin] = useState('');
  const [gstinError, setGstinError] = useState('');
  const [address, setAddress] = useState('');
  const [pincode, setPincode] = useState('');
  const [lat, setLat] = useState(null);
  const [lng, setLng] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationText, setLocationText] = useState('');

  const { login } = useAuth();
  const { theme } = useTheme();
  const c = theme.colors;

  const sendOTP = async () => {
    if (mobile.length !== 10) {
      Alert.alert('Invalid Number', 'Please enter a valid 10 digit mobile number');
      return;
    }
    setLoading(true);
    try {
      await authAPI.sendOTP(mobile);
      setStep('otp');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to send OTP');
    } finally { setLoading(false); }
  };

  const verifyOTP = async () => {
    if (otp.length !== 6) {
      Alert.alert('Invalid OTP', 'Please enter the 6 digit OTP');
      return;
    }
    setLoading(true);
    try {
      const res = await authAPI.verifyOTP(mobile, otp, null, null);
      const userRole = res.data.user.role;
      if (!ALLOWED_ROLES.includes(userRole)) {
        Alert.alert('Wrong App', `This mobile is registered as ${userRole.replace(/_/g, ' ')}.\n\nPlease use the correct app.`,
          [{ text: 'OK', onPress: () => { setStep('mobile'); setOtp(''); } }]);
        return;
      }
      await login({ token: res.data.token, refresh_token: res.data.refresh_token }, res.data.user);
    } catch (err) {
      const errMsg = err.response?.data?.error || '';
      if (errMsg.includes('Name and role required')) {
        setStep('register_name');
      } else {
        Alert.alert('Error', errMsg || 'Invalid OTP');
      }
    } finally { setLoading(false); }
  };

  const goToDetails = () => {
    if (!name.trim()) { Alert.alert('Required', 'Please enter your name'); return; }
    if (!businessName.trim()) { Alert.alert('Required', 'Please enter your business name'); return; }
    setStep('register_details');
  };

  const validateAndGoLocation = () => {
    if (!gstin.trim()) { setGstinError('GSTIN is required for wholesalers'); return; }
    if (!validateGSTIN(gstin)) { setGstinError('Invalid GSTIN format (e.g. 29ABCDE1234F1Z5)'); return; }
    if (!address.trim()) { Alert.alert('Required', 'Please enter your warehouse address'); return; }
    if (pincode.length !== 6) { Alert.alert('Invalid Pincode', 'Please enter a valid 6 digit pincode'); return; }
    setGstinError('');
    setStep('register_location');
  };

  const detectLocation = async () => {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is needed to set your warehouse location.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLat(loc.coords.latitude);
      setLng(loc.coords.longitude);
      const geo = await Location.reverseGeocodeAsync({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      if (geo.length > 0) {
        const g = geo[0];
        setLocationText(`${g.street || ''} ${g.city || ''} ${g.region || ''}`.trim());
      } else {
        setLocationText(`${loc.coords.latitude.toFixed(4)}, ${loc.coords.longitude.toFixed(4)}`);
      }
    } catch (err) {
      Alert.alert('Error', 'Could not get location. Please try again.');
    } finally { setLocationLoading(false); }
  };

  const registerAndLogin = async () => {
    setLoading(true);
    try {
      const res = await authAPI.verifyOTP(mobile, otp, 'wholesaler_admin', name.trim());
      const token = res.data.token;
      try {
        await api.put('/auth/profile', {
          address: address.trim(),
          pincode: pincode.trim(),
          gstin: gstin.trim().toUpperCase(),
          lat: lat || null,
          lng: lng || null,
          business_name: businessName.trim(),
        }, { headers: { Authorization: `Bearer ${token}` } });
      } catch (e) { console.log('Profile update error (non-fatal):', e.message); }
      await login({ token, refresh_token: res.data.refresh_token }, { ...res.data.user, address: address.trim(), gstin: gstin.toUpperCase() });
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Registration failed');
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: c.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* Brand */}
        <View style={[styles.brandSection, { backgroundColor: '#085041' }]}>
          <View style={styles.logoWrap}><VendorNetLogo size={90} /></View>
          <Text style={styles.brandName}>Vendor<Text style={{ color: '#F2C94C' }}>Net</Text></Text>
          <Text style={styles.brandTagline}>Wholesaler Portal</Text>
        </View>

        {/* Progress bar */}
        {['register_name','register_details','register_location'].includes(step) && (
          <View style={[styles.progressBar, { backgroundColor: c.surface }]}>
            {['register_name','register_details','register_location'].map((s,i) => (
              <View key={s} style={[styles.progressStep, {
                backgroundColor: ['register_name','register_details','register_location'].indexOf(step) >= i ? '#1D9E75' : c.borderLight,
              }]} />
            ))}
          </View>
        )}

        <View style={[styles.formSection, { backgroundColor: c.background }]}>

          {/* STEP 1: Mobile */}
          {step === 'mobile' && (
            <>
              <Text style={[styles.formTitle, { color: c.text }]}>Welcome</Text>
              <Text style={[styles.formSubtitle, { color: c.textMuted }]}>Sign in with your mobile number</Text>
              <Text style={[styles.label, { color: c.textSecondary }]}>Mobile Number</Text>
              <View style={[styles.inputRow, { backgroundColor: c.inputBackground, borderColor: c.border }]}>
                <View style={[styles.prefixBox, { borderRightColor: c.border }]}>
                  <Text style={styles.prefixFlag}>🇮🇳</Text>
                  <Text style={[styles.prefix, { color: c.text }]}>+91</Text>
                </View>
                <TextInput
                  style={[styles.inputFlex, { color: c.text }]}
                  placeholder="Enter mobile number"
                  placeholderTextColor={c.placeholder}
                  keyboardType="numeric"
                  maxLength={10}
                  value={mobile}
                  onChangeText={setMobile}
                />
              </View>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: mobile.length === 10 ? '#1D9E75' : c.border }]}
                onPress={sendOTP} disabled={loading || mobile.length !== 10}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Send OTP →</Text>}
              </TouchableOpacity>
              <View style={[styles.infoBadge, { backgroundColor: '#E1F5EE' }]}>
                <Text style={styles.infoBadgeIcon}>🏭</Text>
                <Text style={[styles.infoBadgeText, { color: '#1D9E75' }]}>For wholesalers & wholesale staff only</Text>
              </View>
            </>
          )}

          {/* STEP 2: OTP */}
          {step === 'otp' && (
            <>
              <Text style={[styles.formTitle, { color: c.text }]}>Verify OTP</Text>
              <Text style={[styles.formSubtitle, { color: c.textMuted }]}>Sent to +91 {mobile}</Text>
              <Text style={[styles.label, { color: c.textSecondary }]}>Enter OTP</Text>
              <TextInput
                style={[styles.otpInput, { backgroundColor: c.inputBackground, borderColor: c.border, color: c.text }]}
                placeholder="• • • • • •"
                placeholderTextColor={c.placeholder}
                keyboardType="numeric"
                maxLength={6}
                value={otp}
                onChangeText={setOtp}
                autoFocus
              />
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: otp.length === 6 ? '#1D9E75' : c.border }]}
                onPress={verifyOTP} disabled={loading || otp.length !== 6}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Verify & Login →</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={styles.backRow} onPress={() => { setStep('mobile'); setOtp(''); }}>
                <Text style={[styles.backText, { color: c.textMuted }]}>← Change number</Text>
              </TouchableOpacity>
            </>
          )}

          {/* STEP 3: Name & Business */}
          {step === 'register_name' && (
            <>
              <Text style={[styles.stepBadge, { color: c.textMuted }]}>Step 1 of 3</Text>
              <Text style={[styles.formTitle, { color: c.text }]}>Create Account</Text>
              <Text style={[styles.formSubtitle, { color: c.textMuted }]}>Set up your wholesaler account</Text>

              <View style={{ marginBottom: 16 }}>
                <Text style={[styles.label, { color: c.textSecondary }]}>Your Name *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: c.inputBackground, borderColor: c.border, color: c.text }]}
                  placeholder="e.g. Rajesh Kumar"
                  placeholderTextColor={c.placeholder}
                  value={name}
                  onChangeText={setName}
                  autoFocus
                />
              </View>

              <View style={{ marginBottom: 16 }}>
                <Text style={[styles.label, { color: c.textSecondary }]}>Business / Trade Name *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: c.inputBackground, borderColor: c.border, color: c.text }]}
                  placeholder="e.g. Rajesh Hardware Traders"
                  placeholderTextColor={c.placeholder}
                  value={businessName}
                  onChangeText={setBusinessName}
                />
                <Text style={[styles.hintText, { color: c.textMuted }]}>This will be shown to retailers</Text>
              </View>

              <View style={[styles.roleInfo, { backgroundColor: '#E1F5EE' }]}>
                <Text style={styles.roleInfoIcon}>🏭</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.roleInfoTitle, { color: '#1D9E75' }]}>Wholesaler Account</Text>
                  <Text style={[styles.roleInfoSub, { color: c.textMuted }]}>List products, manage orders, upload invoices</Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.btn, { backgroundColor: name.trim() && businessName.trim() ? '#1D9E75' : c.border }]}
                onPress={goToDetails} disabled={!name.trim() || !businessName.trim()}>
                <Text style={styles.btnText}>Next → Business Details</Text>
              </TouchableOpacity>
            </>
          )}

          {/* STEP 4: Business Details */}
          {step === 'register_details' && (
            <>
              <Text style={[styles.stepBadge, { color: c.textMuted }]}>Step 2 of 3</Text>
              <Text style={[styles.formTitle, { color: c.text }]}>Business Details</Text>
              <Text style={[styles.formSubtitle, { color: c.textMuted }]}>Required for GST compliance</Text>

              <View style={{ marginBottom: 16 }}>
                <Text style={[styles.label, { color: c.textSecondary }]}>GSTIN *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: c.inputBackground, borderColor: gstinError ? '#FF453A' : c.border, color: c.text }]}
                  placeholder="e.g. 29ABCDE1234F1Z5"
                  placeholderTextColor={c.placeholder}
                  value={gstin}
                  onChangeText={(v) => { setGstin(v.toUpperCase()); setGstinError(''); }}
                  maxLength={15}
                  autoCapitalize="characters"
                />
                {gstinError ? <Text style={styles.errorText}>{gstinError}</Text> : null}
                <Text style={[styles.hintText, { color: c.textMuted }]}>Mandatory for wholesaler registration</Text>
              </View>

              <View style={{ marginBottom: 16 }}>
                <Text style={[styles.label, { color: c.textSecondary }]}>Warehouse / Office Address *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: c.inputBackground, borderColor: c.border, color: c.text }]}
                  placeholder="e.g. 45, Industrial Area, Whitefield"
                  placeholderTextColor={c.placeholder}
                  value={address}
                  onChangeText={setAddress}
                />
              </View>

              <View style={{ marginBottom: 16 }}>
                <Text style={[styles.label, { color: c.textSecondary }]}>Pincode *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: c.inputBackground, borderColor: c.border, color: c.text }]}
                  placeholder="e.g. 560066"
                  placeholderTextColor={c.placeholder}
                  value={pincode}
                  onChangeText={setPincode}
                  keyboardType="numeric"
                  maxLength={6}
                />
              </View>

              <TouchableOpacity
                style={[styles.btn, { backgroundColor: address.trim() && pincode.length === 6 ? '#1D9E75' : c.border }]}
                onPress={validateAndGoLocation}
                disabled={!address.trim() || pincode.length !== 6}>
                <Text style={styles.btnText}>Next → Set Location</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.backRow} onPress={() => setStep('register_name')}>
                <Text style={[styles.backText, { color: c.textMuted }]}>← Back</Text>
              </TouchableOpacity>
            </>
          )}

          {/* STEP 5: Location */}
          {step === 'register_location' && (
            <>
              <Text style={[styles.stepBadge, { color: c.textMuted }]}>Step 3 of 3</Text>
              <Text style={[styles.formTitle, { color: c.text }]}>Warehouse Location</Text>
              <Text style={[styles.formSubtitle, { color: c.textMuted }]}>Used to calculate delivery radius for retailers</Text>

              <TouchableOpacity
                style={[styles.locationBtn, { backgroundColor: '#E1F5EE', borderColor: lat ? '#1D9E75' : c.border }]}
                onPress={detectLocation} disabled={locationLoading}>
                {locationLoading
                  ? <ActivityIndicator color="#1D9E75" size="small" />
                  : <Text style={{ fontSize: 24 }}>📍</Text>
                }
                <View style={{ flex: 1 }}>
                  <Text style={[styles.locationBtnTitle, { color: '#1D9E75' }]}>
                    {lat ? 'Location Detected ✓' : 'Detect Warehouse Location'}
                  </Text>
                  <Text style={[styles.locationBtnSub, { color: c.textMuted }]} numberOfLines={2}>
                    {locationText || 'Tap to use GPS'}
                  </Text>
                </View>
              </TouchableOpacity>

              <View style={styles.orRow}>
                <View style={[styles.orLine, { backgroundColor: c.borderLight }]} />
                <Text style={[styles.orText, { color: c.textMuted }]}>or enter manually</Text>
                <View style={[styles.orLine, { backgroundColor: c.borderLight }]} />
              </View>

              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { color: c.textSecondary }]}>Latitude</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: c.inputBackground, borderColor: c.border, color: c.text }]}
                    placeholder="e.g. 12.9716"
                    placeholderTextColor={c.placeholder}
                    keyboardType="numeric"
                    value={lat ? lat.toString() : ''}
                    onChangeText={(v) => setLat(parseFloat(v) || null)}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { color: c.textSecondary }]}>Longitude</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: c.inputBackground, borderColor: c.border, color: c.text }]}
                    placeholder="e.g. 77.5946"
                    placeholderTextColor={c.placeholder}
                    keyboardType="numeric"
                    value={lng ? lng.toString() : ''}
                    onChangeText={(v) => setLng(parseFloat(v) || null)}
                  />
                </View>
              </View>

              {/* Summary */}
              <View style={[styles.summaryCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                <Text style={[styles.summaryTitle, { color: c.textMuted }]}>ACCOUNT SUMMARY</Text>
                <Text style={[styles.summaryRow2, { color: c.text }]}>👤 {name}</Text>
                <Text style={[styles.summaryRow2, { color: c.text }]}>🏭 {businessName}</Text>
                <Text style={[styles.summaryRow2, { color: c.text }]}>📋 {gstin}</Text>
                <Text style={[styles.summaryRow2, { color: c.text }]}>📍 {address}, {pincode}</Text>
                {lat && <Text style={[styles.summaryRow2, { color: c.text }]}>🗺 {lat?.toFixed(4)}, {lng?.toFixed(4)}</Text>}
              </View>

              <TouchableOpacity
                style={[styles.btn, { backgroundColor: '#1D9E75' }]}
                onPress={registerAndLogin} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Create Wholesaler Account →</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={styles.backRow} onPress={() => setStep('register_details')}>
                <Text style={[styles.backText, { color: c.textMuted }]}>← Back</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1 },
  brandSection: { paddingTop: 64, paddingBottom: 40, alignItems: 'center' },
  logoWrap: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 10, marginBottom: 20, borderRadius: 24 },
  brandName: { fontSize: 36, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.5 },
  brandTagline: { fontSize: 13, color: 'rgba(255,255,255,0.65)', letterSpacing: 2, textTransform: 'uppercase', marginTop: 6 },
  progressBar: { flexDirection: 'row', gap: 6, padding: 16, paddingBottom: 0 },
  progressStep: { flex: 1, height: 4, borderRadius: 2 },
  formSection: { flex: 1, padding: 28, paddingTop: 28, borderTopLeftRadius: 28, borderTopRightRadius: 28, marginTop: -24 },
  stepBadge: { fontSize: 12, fontWeight: '600', letterSpacing: 0.5, marginBottom: 4 },
  formTitle: { fontSize: 24, fontWeight: '700', marginBottom: 6 },
  formSubtitle: { fontSize: 14, marginBottom: 24 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6, letterSpacing: 0.3 },
  input: { borderWidth: 1.5, borderRadius: 12, height: 50, paddingHorizontal: 14, fontSize: 15 },
  errorText: { color: '#FF453A', fontSize: 11, marginTop: 4 },
  hintText: { fontSize: 11, marginTop: 4 },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 14, marginBottom: 20, overflow: 'hidden', height: 54 },
  prefixBox: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, borderRightWidth: 1, height: '100%', gap: 6 },
  prefixFlag: { fontSize: 18 },
  prefix: { fontSize: 15, fontWeight: '600' },
  inputFlex: { flex: 1, height: '100%', paddingHorizontal: 14, fontSize: 16 },
  otpInput: { borderWidth: 1.5, borderRadius: 14, height: 54, paddingHorizontal: 20, fontSize: 24, letterSpacing: 10, marginBottom: 20, textAlign: 'center' },
  btn: { borderRadius: 14, height: 54, justifyContent: 'center', alignItems: 'center', marginBottom: 16, marginTop: 8 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  backRow: { alignItems: 'center', paddingVertical: 8 },
  backText: { fontSize: 14 },
  infoBadge: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, padding: 12, gap: 8, marginTop: 8 },
  infoBadgeIcon: { fontSize: 16 },
  infoBadgeText: { fontSize: 13, fontWeight: '600' },
  roleInfo: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 14, gap: 12, marginBottom: 8 },
  roleInfoIcon: { fontSize: 28 },
  roleInfoTitle: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  roleInfoSub: { fontSize: 12 },
  locationBtn: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 16, gap: 12, borderWidth: 1.5, marginBottom: 16 },
  locationBtnTitle: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  locationBtnSub: { fontSize: 12, lineHeight: 16 },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  orLine: { flex: 1, height: 1 },
  orText: { fontSize: 12 },
  summaryCard: { borderRadius: 12, padding: 14, borderWidth: 1, marginBottom: 16, marginTop: 4, gap: 6 },
  summaryTitle: { fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
  summaryRow2: { fontSize: 13 },
});
