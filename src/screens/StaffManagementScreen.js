import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, Alert, Modal, Switch, ScrollView
} from 'react-native';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { useFocusEffect } from '@react-navigation/native';

const ALL_PERMISSIONS = [
  { key: 'view_orders',     label: 'View Orders',     icon: '📦' },
  { key: 'accept_orders',   label: 'Accept Orders',   icon: '✓' },
  { key: 'manage_listings', label: 'Manage Listings', icon: '🏷' },
  { key: 'view_analytics',  label: 'View Analytics',  icon: '📊' },
  { key: 'upload_invoice',  label: 'Upload Invoice',  icon: '🧾' },
  { key: 'assign_driver',   label: 'Assign Driver',   icon: '🚚' },
  { key: 'manage_staff',    label: 'Manage Staff',    icon: '👥' },
];

const defaultPerms = () => Object.fromEntries(ALL_PERMISSIONS.map(p => [p.key, p.key === 'view_orders']));

export default function StaffManagementScreen() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ mobile: '', name: '', permissions: defaultPerms() });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const { theme } = useTheme();
  const c = theme.colors;

  useFocusEffect(useCallback(() => { loadStaff(); }, []));

  const loadStaff = async () => {
    setLoading(true);
    try {
      const res = await api.get('/staff/list');
      setStaff(res.data.staff || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const openAdd = () => {
    setForm({ mobile: '', name: '', permissions: defaultPerms() });
    setEditingId(null);
    setError('');
    setShowModal(true);
  };

  const openEdit = (member) => {
    setForm({ mobile: member.mobile, name: member.name, permissions: member.permissions || defaultPerms() });
    setEditingId(member.staff_id);
    setError('');
    setShowModal(true);
  };

  const save = async () => {
    if (!editingId && (!form.mobile || form.mobile.length !== 10)) {
      return setError('Enter valid 10-digit mobile');
    }
    if (!editingId && !form.name) return setError('Name is required');
    setSaving(true); setError('');
    try {
      if (editingId) {
        await api.put(`/staff/${editingId}/permissions`, { permissions: form.permissions });
      } else {
        await api.post('/staff/add', { mobile: form.mobile, name: form.name, permissions: form.permissions });
      }
      setShowModal(false);
      await loadStaff();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save');
    } finally { setSaving(false); }
  };

  const toggleActive = async (staffId, current) => {
    try {
      await api.put(`/staff/${staffId}/toggle`);
      setStaff(prev => prev.map(s => s.staff_id === staffId ? { ...s, is_active: !current } : s));
    } catch { Alert.alert('Error', 'Failed to update'); }
  };

  const removeStaff = (staffId, name) => {
    Alert.alert('Remove Staff', `Remove ${name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/staff/${staffId}`);
            setStaff(prev => prev.filter(s => s.staff_id !== staffId));
          } catch { Alert.alert('Error', 'Failed to remove'); }
        }
      }
    ]);
  };

  const togglePerm = (key) => {
    setForm(f => ({ ...f, permissions: { ...f.permissions, [key]: !f.permissions[key] } }));
  };

  const renderMember = ({ item }) => (
    <View style={[styles.card, { backgroundColor: c.surface }]}>
      {/* Header */}
      <View style={styles.memberHeader}>
        <View style={[styles.avatar, { backgroundColor: c.primary }]}>
          <Text style={styles.avatarText}>{item.name?.charAt(0)?.toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.memberName, { color: c.text }]}>{item.name}</Text>
          <Text style={[styles.memberMobile, { color: c.primary }]}>+91 {item.mobile}</Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: item.is_active ? '#003A10' : '#2A0A0A' }]}>
          <Text style={[styles.statusText, { color: item.is_active ? '#30D158' : '#FF453A' }]}>
            {item.is_active ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>

      {/* Permissions grid */}
      <View style={styles.permGrid}>
        {ALL_PERMISSIONS.map(p => (
          <View key={p.key} style={[styles.permChip, {
            backgroundColor: item.permissions?.[p.key] ? '#003A10' : c.surfaceSecondary,
          }]}>
            <Text style={[styles.permChipText, { color: item.permissions?.[p.key] ? '#30D158' : c.textMuted }]}>
              {item.permissions?.[p.key] ? '✓' : '✗'} {p.label}
            </Text>
          </View>
        ))}
      </View>

      {/* Actions */}
      <View style={styles.actionRow}>
        <TouchableOpacity style={[styles.editBtn, { backgroundColor: c.primaryLight }]}
          onPress={() => openEdit(item)}>
          <Text style={[styles.editBtnText, { color: c.primary }]}>✏ Edit Permissions</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.toggleBtn, {
          backgroundColor: item.is_active ? '#2A1500' : '#003A10'
        }]} onPress={() => toggleActive(item.staff_id, item.is_active)}>
          <Text style={[styles.toggleBtnText, { color: item.is_active ? '#FF9500' : '#30D158' }]}>
            {item.is_active ? 'Deactivate' : 'Activate'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.removeBtn}
          onPress={() => removeStaff(item.staff_id, item.name)}>
          <Text style={styles.removeBtnText}>✕</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) return (
    <View style={[styles.loading, { backgroundColor: c.background }]}>
      <ActivityIndicator size="large" color={c.primary} />
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: c.primary }]}>
        <View>
          <Text style={styles.title}>Staff</Text>
          <Text style={styles.headerSub}>{staff.length} staff members</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
          <Text style={styles.addBtnText}>+ Add Staff</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={staff}
        renderItem={renderMember}
        keyExtractor={item => item.staff_id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', marginTop: 80 }}>
            <Text style={{ fontSize: 48, marginBottom: 16 }}>👥</Text>
            <Text style={[{ color: c.text, fontSize: 18, fontWeight: '700', marginBottom: 8 }]}>No staff members</Text>
            <TouchableOpacity style={[styles.addBtn, { paddingHorizontal: 24 }]} onPress={openAdd}>
              <Text style={styles.addBtnText}>Add first staff member</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Add/Edit Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { backgroundColor: c.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: c.text }]}>
                {editingId ? 'Edit Permissions' : 'Add Staff Member'}
              </Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Text style={{ color: c.textMuted, fontSize: 20 }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView>
              {error ? (
                <View style={styles.errorBox}>
                  <Text style={{ color: '#FF453A', fontSize: 12 }}>{error}</Text>
                </View>
              ) : null}

              {!editingId && (
                <>
                  <Text style={[styles.fieldLabel, { color: c.textMuted }]}>Mobile Number *</Text>
                  <View style={[styles.mobileRow, { backgroundColor: c.surfaceSecondary, borderColor: c.border }]}>
                    <Text style={{ color: c.textMuted, fontSize: 14, marginRight: 8 }}>+91</Text>
                    <TextInput
                      style={[styles.mobileInput, { color: c.text }]}
                      value={form.mobile}
                      onChangeText={v => setForm(f => ({ ...f, mobile: v.replace(/\D/g, '') }))}
                      placeholder="10-digit mobile"
                      placeholderTextColor={c.textMuted}
                      keyboardType="phone-pad"
                      maxLength={10}
                    />
                  </View>

                  <Text style={[styles.fieldLabel, { color: c.textMuted }]}>Full Name *</Text>
                  <TextInput
                    style={[styles.textInput, { backgroundColor: c.surfaceSecondary, color: c.text, borderColor: c.border }]}
                    value={form.name}
                    onChangeText={v => setForm(f => ({ ...f, name: v }))}
                    placeholder="Staff member name"
                    placeholderTextColor={c.textMuted}
                  />
                </>
              )}

              <Text style={[styles.fieldLabel, { color: c.textMuted, marginTop: 8 }]}>Permissions</Text>
              {ALL_PERMISSIONS.map(p => (
                <View key={p.key} style={[styles.permRow, { borderBottomColor: c.borderLight }]}>
                  <Text style={{ fontSize: 16, marginRight: 10 }}>{p.icon}</Text>
                  <Text style={[styles.permLabel, { color: c.text }]}>{p.label}</Text>
                  <Switch
                    value={!!form.permissions[p.key]}
                    onValueChange={() => togglePerm(p.key)}
                    trackColor={{ false: c.surfaceSecondary, true: '#1D9E75' }}
                    thumbColor={form.permissions[p.key] ? '#30D158' : '#ccc'}
                  />
                </View>
              ))}

              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: c.primary, opacity: saving ? 0.6 : 1, marginTop: 16 }]}
                onPress={save} disabled={saving}>
                <Text style={styles.saveBtnText}>
                  {saving ? 'Saving...' : editingId ? 'Update Permissions' : 'Add Staff Member'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 20, paddingTop: 52, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 3 },
  addBtn: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  list: { padding: 16, paddingBottom: 32 },
  card: { borderRadius: 14, padding: 16, marginBottom: 12 },
  memberHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  memberName: { fontSize: 15, fontWeight: '700' },
  memberMobile: { fontSize: 12, marginTop: 2 },
  statusPill: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 11, fontWeight: '700' },
  permGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  permChip: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  permChipText: { fontSize: 10, fontWeight: '600' },
  actionRow: { flexDirection: 'row', gap: 8 },
  editBtn: { flex: 1, borderRadius: 10, paddingVertical: 9, alignItems: 'center' },
  editBtnText: { fontSize: 12, fontWeight: '600' },
  toggleBtn: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, alignItems: 'center' },
  toggleBtnText: { fontSize: 12, fontWeight: '600' },
  removeBtn: { backgroundColor: '#2A0A0A', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, alignItems: 'center' },
  removeBtnText: { color: '#FF453A', fontWeight: '700', fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modal: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 17, fontWeight: '700' },
  errorBox: { backgroundColor: '#2A0A0A', borderRadius: 8, padding: 10, marginBottom: 14, borderWidth: 1, borderColor: '#FF453A' },
  fieldLabel: { fontSize: 11, fontWeight: '600', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.3 },
  mobileRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, marginBottom: 14 },
  mobileInput: { flex: 1, paddingVertical: 12, fontSize: 15 },
  textInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, marginBottom: 14 },
  permRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 0.5 },
  permLabel: { flex: 1, fontSize: 14 },
  saveBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
