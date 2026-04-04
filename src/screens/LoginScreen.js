import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('mobile');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const sendOTP = async () => {
    if (mobile.length !== 10) {
      Alert.alert('Error', 'Enter valid 10 digit mobile number');
      return;
    }
    setLoading(true);
    try {
      await authAPI.sendOTP(mobile);
      setStep('otp');
      Alert.alert('Success', 'OTP sent to ' + mobile);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async () => {
    if (otp.length !== 6) {
      Alert.alert('Error', 'Enter valid 6 digit OTP');
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
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        <Text style={styles.logo}>VendorNet</Text>
        <Text style={styles.tagline}>Wholesaler Portal</Text>

        {step === 'mobile' ? (
          <>
            <Text style={styles.label}>Mobile Number</Text>
            <View style={styles.inputRow}>
              <Text style={styles.prefix}>+91</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter mobile number"
                keyboardType="numeric"
                maxLength={10}
                value={mobile}
                onChangeText={setMobile}
              />
            </View>
            <TouchableOpacity
              style={styles.btn}
              onPress={sendOTP}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnText}>Send OTP</Text>
              }
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.label}>Enter OTP sent to +91 {mobile}</Text>
            <TextInput
              style={styles.otpInput}
              placeholder="Enter 6 digit OTP"
              keyboardType="numeric"
              maxLength={6}
              value={otp}
              onChangeText={setOtp}
            />
            <TouchableOpacity
              style={styles.btn}
              onPress={verifyOTP}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnText}>Verify OTP</Text>
              }
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setStep('mobile')}>
              <Text style={styles.changeNum}>Change number</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  inner: { flex: 1, padding: 24, justifyContent: 'center' },
  logo: { fontSize: 36, fontWeight: 'bold', color: '#0F6E56', textAlign: 'center', marginBottom: 6 },
  tagline: { fontSize: 14, color: '#888', textAlign: 'center', marginBottom: 48 },
  label: { fontSize: 14, color: '#333', marginBottom: 8, fontWeight: '500' },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#ddd', borderRadius: 10, marginBottom: 16, paddingHorizontal: 12 },
  prefix: { fontSize: 16, color: '#333', marginRight: 8 },
  input: { flex: 1, height: 48, fontSize: 16 },
  otpInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, height: 48, paddingHorizontal: 16, fontSize: 20, letterSpacing: 8, marginBottom: 16 },
  btn: { backgroundColor: '#0F6E56', borderRadius: 10, height: 50, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  changeNum: { color: '#0F6E56', textAlign: 'center', fontSize: 14 }
});