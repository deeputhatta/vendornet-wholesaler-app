import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
  TextInput, Alert, Switch, Modal, KeyboardAvoidingView, Platform
} from 'react-native';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';

const ALL_PERMISSIONS = [
  { key: 'view_orders',     label: 'View Orders',      icon: '📦', desc: 'See incoming orders' },
  { key: 'accept_orders',   label: 'Accept Orders',    icon: '✅', desc: 'Accept or reject orders' },
  { key: 'manage_listings', label: 'Manage Listings',  icon: '🏷', desc: 'Add/edit products' },
  { key: 'view_analytics',  label: 'View Analytics',   icon: '📈', desc: 'See reports and stats' },
  { key: 'upload_invoice',  label: 'Upload Invoice',   icon: '🧾', desc: 'Upload delivery invoices' },
  { key: 'assign_driver',   label: 'Assign Driver',    icon: '🚚', desc: 'Assign delivery drivers' },
  { key: 'place_orders',    label: 'Place Orders',     icon: '🛒', desc: 'Place orders on behalf' },
  { key: 'manage_staff',    label: 'Manage Staff',     icon: '👥', desc: 'Add/remove staff members' },
];

export default function StaffManagementScreen() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addModal, setAddModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [saving, setSaving] = useState(false);

  // Add form
  const [mobile, setMobile] = useState('');
  const [name, setName] = useState('');
  const [newPermissions, setNewPermissions] = useState({
    view_orders: true,
    accept_orders: false,
    manage_listings: false,
    view_analytics: false,
    upload_invoice: false,
    assign_driver: false,
    place_orders: false,
    manage_staff: false,
  });

  // Edit permissions
  const [editPermissions, setEditPermissions] = useState({});

  const { theme } = useTheme();
  const c = theme.colors;

  useEffect(() => { loadStaff(); }, []);

  const loadStaff = async () => {
    try {
      const res = await api.get('/staff/list');
      setStaff(res.data.staff || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const addStaff = async () => {
    if (!mobile || mobile.length !== 10) {
      Alert.alert('Error', 'Enter valid 10 digit mobile number');
      return;
    }
    if (!name.trim()) {
      Alert.alert('Error', 'Enter staff name');
      return;
    }
    setSaving(true);
    try {
      await api.post('/staff/add', { mobile, name, permissions: newPermissions });
      setAddModal(false);
      setMobile('');
      setName('');
      setNewPermissions({
        view_orders: true, accept_orders: false,
        manage_listings: false, view_analytics: false,
        upload_invoice: false, assign_driver: false,
        place_orders: false, manage_staff: false,
      });
      loadStaff();
      Alert.alert('✓ Added', 'Staff member added successfully');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to add staff');
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (member) => {
    setSelectedStaff(member);
    setEditPermissions({ ...member.permissions });
    setEditModal(true);
  };

  const savePermissions = async () => {
    setSaving(true);
    try {
      await api.put(`/staff/${selectedStaff.staff_id}/permissions`, {
        permissions: editPermissions,
      });
      setEditModal(false);
      loadStaff();
      Alert.alert('✓ Updated', 'Permissions updated successfully');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (member) => {
    try {
      await api.put(`/staff/${member.staff_id}/toggle`);
      loadStaff();
    } catch (err) {
      Alert.alert('Error', 'Failed to update status');
    }
  };

  const removeStaff = (member) => {
    Alert.alert(
      'Remove Staff',
      `Remove ${member.name} from your team?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove', style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/staff/${member.staff_id}`);
              loadStaff();
            } catch (err) {
              Alert.alert('Error', 'Failed to remove staff');
            }
          }
        }
      ]
    );
  };

  const PermissionToggle = ({ permKey, permissions, setPermissions, c }) => {
    const perm = ALL_PERMISSIONS.find(p => p.key === permKey);
    if (!perm) return null;
    return (
      <View style={[styles.permRow, { borderBottomColor: c.borderLight }]}>
        <View style={styles.permLeft}>
          <Text style={styles.permIcon}>{perm.icon}</Text>
          <View>
            <Text style={[styles.permLabel, { color: c.text }]}>{perm.label}</Text>
            <Text style={[styles.permDesc, { color: c.textMuted }]}>{perm.desc}</Text>
          </View>
        </View>
        <Switch
          value={permissions[permKey] || false}
          onValueChange={v => setPermissions(p => ({ ...p, [permKey]: v }))}
          trackColor={{ false: c.border, true: c.primary }}
          thumbColor="#FFFFFF"
        />
      </View>
    );
  };

  if (loading) return (
    <View style={[styles.loading, { backgroundColor: c.background }]}>
      <ActivityIndicator size="large" color={c.primary} />
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>

      {/* Header */}
      <View style={[styles.header, { backgroundColor: c.primary }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>Staff Management</Text>
            <Text style={styles.headerSub}>{staff.length} team members</Text>
          </View>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
            onPress={() => setAddModal(true)}
          >
            <Text style={styles.addBtnText}>+ Add Staff</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadStaff(); }}
            tintColor={c.primary} colors={[c.primary]}
          />
        }
      >
        {staff.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>👥</Text>
            <Text style={[styles.emptyTitle, { color: c.text }]}>No staff members yet</Text>
            <Text style={[styles.emptySub, { color: c.textMuted }]}>
              Add staff members to delegate tasks
            </Text>
            <TouchableOpacity
              style={[styles.emptyBtn, { backgroundColor: c.primary }]}
              onPress={() => setAddModal(true)}
            >
              <Text style={styles.emptyBtnText}>+ Add First Staff Member</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.content}>
            {staff.map((member) => (
              <View
                key={member.staff_id}
                style={[styles.card, {
                  backgroundColor: c.surface,
                  shadowColor: c.text,
                  borderLeftColor: member.is_active ? c.primary : c.border,
                }]}
              >
                {/* Card header */}
                <View style={styles.cardHeader}>
                  <View style={[styles.avatar, { backgroundColor: member.is_active ? c.primary : c.border }]}>
                    <Text style={styles.avatarText}>
                      {member.name?.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={[styles.staffName, { color: c.text }]}>{member.name}</Text>
                    <Text style={[styles.staffMobile, { color: c.textMuted }]}>
                      +91 {member.mobile}
                    </Text>
                    <View style={[styles.roleBadge, {
                      backgroundColor: member.is_active ? '#003A10' : '#2A2A2A',
                    }]}>
                      <Text style={[styles.roleText, {
                        color: member.is_active ? '#30D158' : c.textMuted,
                      }]}>
                        {member.is_active ? '● Active' : '○ Inactive'}
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={member.is_active}
                    onValueChange={() => toggleActive(member)}
                    trackColor={{ false: c.border, true: c.primary }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                {/* Permissions summary */}
                <View style={[styles.permsSummary, { borderTopColor: c.borderLight }]}>
                  <Text style={[styles.permsTitle, { color: c.textMuted }]}>Permissions</Text>
                  <View style={styles.permsTags}>
                    {ALL_PERMISSIONS.filter(p => member.permissions?.[p.key]).map(p => (
                      <View key={p.key} style={[styles.permTag, { backgroundColor: c.primaryLight }]}>
                        <Text style={styles.permTagIcon}>{p.icon}</Text>
                        <Text style={[styles.permTagText, { color: c.primary }]}>{p.label}</Text>
                      </View>
                    ))}
                    {ALL_PERMISSIONS.filter(p => member.permissions?.[p.key]).length === 0 && (
                      <Text style={[styles.noPerms, { color: c.textMuted }]}>No permissions assigned</Text>
                    )}
                  </View>
                </View>

                {/* Actions */}
                <View style={[styles.cardActions, { borderTopColor: c.borderLight }]}>
                  <TouchableOpacity
                    style={[styles.editPermBtn, { backgroundColor: c.primaryLight }]}
                    onPress={() => openEdit(member)}
                  >
                    <Text style={[styles.editPermBtnText, { color: c.primary }]}>
                      ✏️ Edit Permissions
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.removeBtn, { backgroundColor: '#2A0A0A' }]}
                    onPress={() => removeStaff(member)}
                  >
                    <Text style={styles.removeBtnText}>🗑</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
        <View style={{ height: 32 }} />
      </ScrollView>

      {/* ── ADD STAFF MODAL ── */}
      <Modal visible={addModal} animationType="slide" transparent onRequestClose={() => setAddModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: c.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: c.border }]}>
              <View>
                <Text style={[styles.modalTitle, { color: c.text }]}>Add Staff Member</Text>
                <Text style={[styles.modalSub, { color: c.textMuted }]}>
                  They can login with their mobile number
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.closeBtn, { backgroundColor: c.surfaceSecondary }]}
                onPress={() => setAddModal(false)}
              >
                <Text style={[styles.closeBtnText, { color: c.textMuted }]}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Name */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: c.textSecondary }]}>Full Name *</Text>
                <TextInput
                  style={[styles.fieldInput, { backgroundColor: c.inputBackground, borderColor: c.border, color: c.text }]}
                  placeholder="e.g. Ravi Kumar"
                  placeholderTextColor={c.placeholder}
                  value={name}
                  onChangeText={setName}
                />
              </View>

              {/* Mobile */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: c.textSecondary }]}>Mobile Number *</Text>
                <TextInput
                  style={[styles.fieldInput, { backgroundColor: c.inputBackground, borderColor: c.border, color: c.text }]}
                  placeholder="10 digit mobile number"
                  placeholderTextColor={c.placeholder}
                  keyboardType="numeric"
                  maxLength={10}
                  value={mobile}
                  onChangeText={setMobile}
                />
              </View>

              {/* Permissions */}
              <Text style={[styles.permsHeader, { color: c.text }]}>Permissions</Text>
              <View style={[styles.permsCard, { backgroundColor: c.surfaceSecondary }]}>
                {ALL_PERMISSIONS.map(p => (
                  <PermissionToggle
                    key={p.key}
                    permKey={p.key}
                    permissions={newPermissions}
                    setPermissions={setNewPermissions}
                    c={c}
                  />
                ))}
              </View>

              {/* Save */}
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: c.primary }]}
                onPress={addStaff}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.saveBtnText}>Add Staff Member</Text>
                }
              </TouchableOpacity>
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── EDIT PERMISSIONS MODAL ── */}
      <Modal visible={editModal} animationType="slide" transparent onRequestClose={() => setEditModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: c.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: c.border }]}>
              <View>
                <Text style={[styles.modalTitle, { color: c.text }]}>Edit Permissions</Text>
                <Text style={[styles.modalSub, { color: c.textMuted }]}>
                  {selectedStaff?.name}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.closeBtn, { backgroundColor: c.surfaceSecondary }]}
                onPress={() => setEditModal(false)}
              >
                <Text style={[styles.closeBtnText, { color: c.textMuted }]}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={[styles.permsCard, { backgroundColor: c.surfaceSecondary }]}>
                {ALL_PERMISSIONS.map(p => (
                  <PermissionToggle
                    key={p.key}
                    permKey={p.key}
                    permissions={editPermissions}
                    setPermissions={setEditPermissions}
                    c={c}
                  />
                ))}
              </View>

              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: c.primary }]}
                onPress={savePermissions}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.saveBtnText}>Save Permissions</Text>
                }
              </TouchableOpacity>
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: { padding: 20, paddingTop: 48 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#FFFFFF' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 3 },
  addBtn: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },

  content: { padding: 16 },

  card: {
    borderRadius: 16, marginBottom: 14,
    overflow: 'hidden', elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 6,
    borderLeftWidth: 4,
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14, gap: 12,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  cardInfo: { flex: 1 },
  staffName: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  staffMobile: { fontSize: 12, marginBottom: 4 },
  roleBadge: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  roleText: { fontSize: 11, fontWeight: '600' },

  permsSummary: { padding: 14, borderTopWidth: 0.5 },
  permsTitle: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5, marginBottom: 8 },
  permsTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  permTag: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, gap: 4,
  },
  permTagIcon: { fontSize: 12 },
  permTagText: { fontSize: 11, fontWeight: '600' },
  noPerms: { fontSize: 12 },

  cardActions: {
    flexDirection: 'row', padding: 10,
    borderTopWidth: 0.5, gap: 8,
  },
  editPermBtn: { flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  editPermBtnText: { fontSize: 13, fontWeight: '600' },
  removeBtn: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, alignItems: 'center' },
  removeBtnText: { fontSize: 16 },

  empty: { alignItems: 'center', marginTop: 80, paddingHorizontal: 32 },
  emptyEmoji: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  emptySub: { fontSize: 14, textAlign: 'center', marginBottom: 24 },
  emptyBtn: { borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  emptyBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalCard: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', padding: 20, borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 17, fontWeight: '700' },
  modalSub: { fontSize: 13, marginTop: 2 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  closeBtnText: { fontSize: 14 },
  modalBody: { padding: 20 },

  fieldGroup: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  fieldInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, height: 48, fontSize: 15 },

  permsHeader: { fontSize: 15, fontWeight: '700', marginBottom: 10 },
  permsCard: { borderRadius: 14, overflow: 'hidden', marginBottom: 20 },
  permRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', padding: 14, borderBottomWidth: 0.5,
  },
  permLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  permIcon: { fontSize: 20 },
  permLabel: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  permDesc: { fontSize: 11 },

  saveBtn: { borderRadius: 12, height: 52, justifyContent: 'center', alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});