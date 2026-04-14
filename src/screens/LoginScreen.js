import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import VendorNetLogo from '../components/VendorNetLogo';

export default function LoginScreen() {
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('mobile');
  const [loading, setLoading] = useState(false);
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
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async () => {
    if (otp.length !== 6) {
      Alert.alert('Invalid OTP', 'Please enter the 6 digit OTP');
      return;
    }
    setLoading(true);
    try {
      const res = await authAPI.verifyOTP(mobile, otp, 'wholesaler', 'Wholesaler User');
      await login(
        { token: res.data.token, refresh_token: res.data.refresh_token },
        res.data.user
      );
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: c.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Brand section */}
        <View style={[styles.brandSection, { backgroundColor: c.primary }]}>
          <View style={styles.logoWrap}>
            <VendorNetLogo size={100} />
          </View>
          <Text style={styles.brandName}>
            <Text style={{ color: '#FFFFFF' }}>Vendor</Text>
            <Text style={{ color: '#F2C94C' }}>Net</Text>
          </Text>
          <Text style={styles.brandTagline}>WHOLESALER PORTAL</Text>
        </View>

        {/* Form section */}
        <View style={[styles.formSection, { backgroundColor: c.background }]}>
          {step === 'mobile' ? (
            <>
              <Text style={[styles.formTitle, { color: c.text }]}>Welcome Back</Text>
              <Text style={[styles.formSubtitle, { color: c.textMuted }]}>
                Sign in with your mobile number
              </Text>

              <Text style={[styles.label, { color: c.textSecondary }]}>Mobile Number</Text>
              <View style={[styles.inputRow, {
                backgroundColor: c.inputBackground,
                borderColor: c.border,
              }]}>
                <View style={[styles.prefixBox, { borderRightColor: c.border }]}>
                  <Text style={styles.prefixFlag}>🇮🇳</Text>
                  <Text style={[styles.prefix, { color: c.text }]}>+91</Text>
                </View>
                <TextInput
                  style={[styles.input, { color: c.text }]}
                  placeholder="Enter mobile number"
                  placeholderTextColor={c.placeholder}
                  keyboardType="numeric"
                  maxLength={10}
                  value={mobile}
                  onChangeText={setMobile}
                />
              </View>

              <TouchableOpacity
                style={[styles.btn, {
                  backgroundColor: mobile.length === 10 ? c.primary : c.border,
                }]}
                onPress={sendOTP}
                disabled={loading || mobile.length !== 10}
                activeOpacity={0.85}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.btnText}>Send OTP →</Text>
                }
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={[styles.formTitle, { color: c.text }]}>Verify OTP</Text>
              <Text style={[styles.formSubtitle, { color: c.textMuted }]}>
                Sent to +91 {mobile}
              </Text>

              <Text style={[styles.label, { color: c.textSecondary }]}>Enter OTP</Text>
              <TextInput
                style={[styles.otpInput, {
                  backgroundColor: c.inputBackground,
                  borderColor: c.border,
                  color: c.text,
                }]}
                placeholder="• • • • • •"
                placeholderTextColor={c.placeholder}
                keyboardType="numeric"
                maxLength={6}
                value={otp}
                onChangeText={setOtp}
              />

              <TouchableOpacity
                style={[styles.btn, {
                  backgroundColor: otp.length === 6 ? c.primary : c.border,
                }]}
                onPress={verifyOTP}
                disabled={loading || otp.length !== 6}
                activeOpacity={0.85}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.btnText}>Verify & Login →</Text>
                }
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.backRow}
                onPress={() => { setStep('mobile'); setOtp(''); }}
              >
                <Text style={[styles.backText, { color: c.textMuted }]}>
                  ← Change number
                </Text>
              </TouchableOpacity>
            </>
          )}

          <Text style={[styles.footer, { color: c.textMuted }]}>
            For registered wholesalers only
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1 },
  brandSection: {
    paddingTop: 64, paddingBottom: 40, alignItems: 'center',
  },
  logoWrap: {
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25, shadowRadius: 16,
    elevation: 10, marginBottom: 20, borderRadius: 24,
  },
  brandName: { fontSize: 36, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.5 },
  brandTagline: {
    fontSize: 12, color: 'rgba(255,255,255,0.65)',
    letterSpacing: 3, marginTop: 6,
  },
  formSection: {
    flex: 1, padding: 28, paddingTop: 36,
    borderTopLeftRadius: 28, borderTopRightRadius: 28, marginTop: -24,
  },
  formTitle: { fontSize: 24, fontWeight: '700', marginBottom: 6 },
  formSubtitle: { fontSize: 14, marginBottom: 28 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 8, letterSpacing: 0.3 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderRadius: 14,
    marginBottom: 20, overflow: 'hidden', height: 54,
  },
  prefixBox: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, borderRightWidth: 1, height: '100%', gap: 6,
  },
  prefixFlag: { fontSize: 18 },
  prefix: { fontSize: 15, fontWeight: '600' },
  input: { flex: 1, height: '100%', paddingHorizontal: 14, fontSize: 16 },
  otpInput: {
    borderWidth: 1.5, borderRadius: 14, height: 54,
    paddingHorizontal: 20, fontSize: 24, letterSpacing: 10,
    marginBottom: 20, textAlign: 'center',
  },
  btn: {
    borderRadius: 14, height: 54,
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  backRow: { alignItems: 'center', paddingVertical: 8 },
  backText: { fontSize: 14 },
  footer: { textAlign: 'center', fontSize: 12, marginTop: 32, letterSpacing: 0.5 },
});