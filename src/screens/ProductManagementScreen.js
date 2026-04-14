import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
  TextInput, Alert, Switch, Modal, KeyboardAvoidingView,
  Platform, Animated
} from 'react-native';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';

export default function ProductManagementScreen() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterActive, setFilterActive] = useState('all');
  const [editModal, setEditModal] = useState(false);
  const [selectedListing, setSelectedListing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({});
  const { theme } = useTheme();
  const c = theme.colors;

  useEffect(() => { loadListings(); }, []);

  const loadListings = async () => {
    try {
      const res = await api.get('/listings/my');
      setListings(res.data.listings || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const openEdit = (listing) => {
    setSelectedListing(listing);
    setEditForm({
      price: String(listing.price),
      offer_price: listing.offer_price ? String(listing.offer_price) : '',
      stock_qty: String(listing.stock_qty),
      min_order_qty: String(listing.min_order_qty),
      delivery_days: String(listing.delivery_days),
      is_active: listing.is_active,
    });
    setEditModal(true);
  };

  const saveListing = async () => {
    if (!editForm.price || isNaN(editForm.price)) {
      Alert.alert('Error', 'Enter a valid price');
      return;
    }
    setSaving(true);
    try {
      await api.put(`/listings/${selectedListing.listing_id}`, {
        price: parseFloat(editForm.price),
        offer_price: editForm.offer_price ? parseFloat(editForm.offer_price) : null,
        stock_qty: parseInt(editForm.stock_qty) || 0,
        min_order_qty: parseInt(editForm.min_order_qty) || 1,
        delivery_days: parseInt(editForm.delivery_days) || 1,
        is_active: editForm.is_active,
      });
      setEditModal(false);
      loadListings();
      Alert.alert('✓ Updated', 'Listing updated successfully');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (listing) => {
    try {
      await api.put(`/listings/${listing.listing_id}`, {
        price: listing.price,
        stock_qty: listing.stock_qty,
        min_order_qty: listing.min_order_qty,
        delivery_days: listing.delivery_days,
        is_active: !listing.is_active,
      });
      loadListings();
    } catch (err) {
      Alert.alert('Error', 'Failed to update status');
    }
  };

  const deleteListing = (listing) => {
    Alert.alert(
      'Delete Listing',
      `Delete ${listing.brand_name} ${listing.generic_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/listings/${listing.listing_id}`);
              loadListings();
            } catch (err) {
              Alert.alert('Error', 'Failed to delete');
            }
          }
        }
      ]
    );
  };

  const filtered = listings.filter(l => {
    const matchSearch = searchQuery.length < 2 ||
      l.generic_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.brand_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchFilter =
      filterActive === 'all' ? true :
      filterActive === 'active' ? l.is_active :
      !l.is_active;
    return matchSearch && matchFilter;
  });

  const stats = {
    total: listings.length,
    active: listings.filter(l => l.is_active).length,
    inactive: listings.filter(l => !l.is_active).length,
    lowStock: listings.filter(l => l.stock_qty < 10).length,
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
        <Text style={styles.headerTitle}>Product Management</Text>
        <Text style={styles.headerSub}>{stats.total} listings</Text>
      </View>

      {/* Stats row */}
      <View style={[styles.statsRow, { backgroundColor: c.surface, borderBottomColor: c.border }]}>
        {[
          { label: 'Total', value: stats.total, color: c.text },
          { label: 'Active', value: stats.active, color: c.primary },
          { label: 'Inactive', value: stats.inactive, color: c.textMuted },
          { label: 'Low Stock', value: stats.lowStock, color: '#FF9500' },
        ].map((s, i) => (
          <View key={i} style={[styles.statItem, {
            borderRightColor: c.borderLight,
            borderRightWidth: i < 3 ? 1 : 0,
          }]}>
            <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
            <Text style={[styles.statLabel, { color: c.textMuted }]}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Search + Filter */}
      <View style={[styles.searchBar, { backgroundColor: c.surface, borderBottomColor: c.border }]}>
        <View style={[styles.searchInput, {
          backgroundColor: c.inputBackground,
          borderColor: c.border,
        }]}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={[styles.searchText, { color: c.text }]}
            placeholder="Search products..."
            placeholderTextColor={c.placeholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={{ color: c.textMuted, fontSize: 14 }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.filterRow}>
          {['all', 'active', 'inactive'].map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.filterBtn, {
                backgroundColor: filterActive === f ? c.primary : c.surfaceSecondary,
                borderColor: filterActive === f ? c.primary : c.border,
              }]}
              onPress={() => setFilterActive(f)}
            >
              <Text style={[styles.filterText, {
                color: filterActive === f ? '#fff' : c.textMuted,
                fontWeight: filterActive === f ? '700' : '400',
              }]}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Listings */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadListings(); }}
            tintColor={c.primary} colors={[c.primary]}
          />
        }
      >
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🏷</Text>
            <Text style={[styles.emptyTitle, { color: c.text }]}>No listings found</Text>
            <Text style={[styles.emptySub, { color: c.textMuted }]}>
              {searchQuery ? 'Try a different search' : 'No listings yet'}
            </Text>
          </View>
        ) : (
          filtered.map((listing, i) => (
            <View
              key={listing.listing_id}
              style={[styles.card, {
                backgroundColor: c.surface,
                shadowColor: c.text,
                borderLeftColor: listing.is_active ? c.primary : c.border,
              }]}
            >
              {/* Card header */}
              <View style={styles.cardTop}>
                <View style={styles.cardInfo}>
                  <Text style={[styles.productName, { color: c.text }]} numberOfLines={1}>
                    {listing.generic_name}
                  </Text>
                  <Text style={[styles.brandName, { color: c.primary }]}>
                    {listing.brand_name}
                  </Text>
                </View>
                <Switch
                  value={listing.is_active}
                  onValueChange={() => toggleActive(listing)}
                  trackColor={{ false: c.border, true: c.primary }}
                  thumbColor={listing.is_active ? '#FFFFFF' : '#FFFFFF'}
                />
              </View>

              {/* Price row */}
              <View style={[styles.priceRow, { borderTopColor: c.borderLight }]}>
                <View style={styles.priceItem}>
                  <Text style={[styles.priceLabel, { color: c.textMuted }]}>Price</Text>
                  <Text style={[styles.priceValue, { color: c.text }]}>₹{listing.price}</Text>
                </View>
                {listing.offer_price && (
                  <View style={styles.priceItem}>
                    <Text style={[styles.priceLabel, { color: c.textMuted }]}>Offer</Text>
                    <Text style={[styles.priceValue, { color: c.success }]}>
                      ₹{listing.offer_price}
                    </Text>
                  </View>
                )}
                <View style={styles.priceItem}>
                  <Text style={[styles.priceLabel, { color: c.textMuted }]}>MOQ</Text>
                  <Text style={[styles.priceValue, { color: c.text }]}>
                    {listing.min_order_qty} units
                  </Text>
                </View>
                <View style={styles.priceItem}>
                  <Text style={[styles.priceLabel, { color: c.textMuted }]}>Delivery</Text>
                  <Text style={[styles.priceValue, { color: c.text }]}>
                    {listing.delivery_days}d
                  </Text>
                </View>
              </View>

              {/* Stock bar */}
              <View style={styles.stockRow}>
                <View style={styles.stockInfo}>
                  <Text style={[styles.stockLabel, {
                    color: listing.stock_qty < 10 ? '#FF9500' : c.textMuted,
                  }]}>
                    {listing.stock_qty < 10 ? '⚠️ ' : ''}Stock: {listing.stock_qty} units
                  </Text>
                  <View style={[styles.stockBarBg, { backgroundColor: c.borderLight }]}>
                    <View style={[styles.stockBarFill, {
                      width: `${Math.min(100, (listing.stock_qty / 500) * 100)}%`,
                      backgroundColor: listing.stock_qty < 10 ? '#FF9500'
                        : listing.stock_qty < 50 ? c.accent : c.primary,
                    }]} />
                  </View>
                </View>
                <View style={[styles.statusBadge, {
                  backgroundColor: listing.is_active ? '#003A10' : '#2A2A2A',
                }]}>
                  <Text style={[styles.statusText, {
                    color: listing.is_active ? '#30D158' : c.textMuted,
                  }]}>
                    {listing.is_active ? '● Live' : '○ Off'}
                  </Text>
                </View>
              </View>

              {/* Action buttons */}
              <View style={[styles.cardActions, { borderTopColor: c.borderLight }]}>
                <TouchableOpacity
                  style={[styles.editBtn, { backgroundColor: c.primaryLight }]}
                  onPress={() => openEdit(listing)}
                >
                  <Text style={[styles.editBtnText, { color: c.primary }]}>✏️ Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.stockBtn, { backgroundColor: '#2A1F00' }]}
                  onPress={() => {
                    setSelectedListing(listing);
                    setEditForm({
                      price: String(listing.price),
                      offer_price: listing.offer_price ? String(listing.offer_price) : '',
                      stock_qty: String(listing.stock_qty),
                      min_order_qty: String(listing.min_order_qty),
                      delivery_days: String(listing.delivery_days),
                      is_active: listing.is_active,
                    });
                    setEditModal(true);
                  }}
                >
                  <Text style={[styles.stockBtnText, { color: '#F2C94C' }]}>📦 Stock</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.deleteBtn, { backgroundColor: '#2A0A0A' }]}
                  onPress={() => deleteListing(listing)}
                >
                  <Text style={styles.deleteBtnText}>🗑</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Edit Modal */}
      <Modal
        visible={editModal}
        animationType="slide"
        transparent
        onRequestClose={() => setEditModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalCard, { backgroundColor: c.surface }]}>

            {/* Modal header */}
            <View style={[styles.modalHeader, { borderBottomColor: c.border }]}>
              <View>
                <Text style={[styles.modalTitle, { color: c.text }]}>
                  Edit Listing
                </Text>
                <Text style={[styles.modalSub, { color: c.textMuted }]}>
                  {selectedListing?.brand_name} {selectedListing?.generic_name}
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

              {/* Fields */}
              {[
                { label: 'Price (₹) *', key: 'price', keyboard: 'numeric', placeholder: 'e.g. 380' },
                { label: 'Offer Price (₹)', key: 'offer_price', keyboard: 'numeric', placeholder: 'Leave blank if no offer' },
                { label: 'Stock Quantity', key: 'stock_qty', keyboard: 'numeric', placeholder: 'e.g. 500' },
                { label: 'Min Order Qty', key: 'min_order_qty', keyboard: 'numeric', placeholder: 'e.g. 10' },
                { label: 'Delivery Days', key: 'delivery_days', keyboard: 'numeric', placeholder: 'e.g. 1' },
              ].map(field => (
                <View key={field.key} style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: c.textSecondary }]}>
                    {field.label}
                  </Text>
                  <TextInput
                    style={[styles.fieldInput, {
                      backgroundColor: c.inputBackground,
                      borderColor: c.border,
                      color: c.text,
                    }]}
                    placeholder={field.placeholder}
                    placeholderTextColor={c.placeholder}
                    keyboardType={field.keyboard}
                    value={editForm[field.key]}
                    onChangeText={v => setEditForm(f => ({ ...f, [field.key]: v }))}
                  />
                </View>
              ))}

              {/* Active toggle */}
              <View style={[styles.toggleRow, {
                backgroundColor: c.inputBackground,
                borderColor: c.border,
              }]}>
                <View>
                  <Text style={[styles.toggleLabel, { color: c.text }]}>Listing Active</Text>
                  <Text style={[styles.toggleSub, { color: c.textMuted }]}>
                    {editForm.is_active ? 'Visible to retailers' : 'Hidden from retailers'}
                  </Text>
                </View>
                <Switch
                  value={editForm.is_active}
                  onValueChange={v => setEditForm(f => ({ ...f, is_active: v }))}
                  trackColor={{ false: c.border, true: c.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>

              {/* Save button */}
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: c.primary }]}
                onPress={saveListing}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.saveBtnText}>Save Changes</Text>
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

  // Header
  header: { padding: 20, paddingTop: 48 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#FFFFFF' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 3 },

  // Stats row
  statsRow: {
    flexDirection: 'row', borderBottomWidth: 1,
  },
  statItem: {
    flex: 1, paddingVertical: 12, alignItems: 'center',
  },
  statValue: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 10, marginTop: 2 },

  // Search
  searchBar: {
    padding: 12, borderBottomWidth: 1,
  },
  searchInput: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 10, paddingHorizontal: 12,
    height: 40, borderWidth: 1, gap: 8, marginBottom: 10,
  },
  searchIcon: { fontSize: 14 },
  searchText: { flex: 1, fontSize: 14 },
  filterRow: { flexDirection: 'row', gap: 8 },
  filterBtn: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1,
  },
  filterText: { fontSize: 12 },

  // Cards
  card: {
    marginHorizontal: 16, marginTop: 12,
    borderRadius: 14, overflow: 'hidden',
    elevation: 1, borderLeftWidth: 4,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 3,
  },
  cardTop: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', padding: 14,
  },
  cardInfo: { flex: 1, marginRight: 12 },
  productName: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  brandName: { fontSize: 12, fontWeight: '500' },

  // Price row
  priceRow: {
    flexDirection: 'row', paddingHorizontal: 14,
    paddingBottom: 12, borderTopWidth: 0.5, paddingTop: 10,
    gap: 16,
  },
  priceItem: {},
  priceLabel: { fontSize: 9, fontWeight: '600', letterSpacing: 0.5, marginBottom: 2 },
  priceValue: { fontSize: 13, fontWeight: '700' },

  // Stock
  stockRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingBottom: 12, gap: 12,
  },
  stockInfo: { flex: 1 },
  stockLabel: { fontSize: 11, marginBottom: 4 },
  stockBarBg: { height: 4, borderRadius: 2, overflow: 'hidden' },
  stockBarFill: { height: '100%', borderRadius: 2 },
  statusBadge: {
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
  },
  statusText: { fontSize: 11, fontWeight: '600' },

  // Card actions
  cardActions: {
    flexDirection: 'row', borderTopWidth: 0.5,
    padding: 10, gap: 8,
  },
  editBtn: {
    flex: 2, borderRadius: 8, paddingVertical: 8,
    alignItems: 'center',
  },
  editBtnText: { fontSize: 13, fontWeight: '600' },
  stockBtn: {
    flex: 2, borderRadius: 8, paddingVertical: 8,
    alignItems: 'center',
  },
  stockBtnText: { fontSize: 13, fontWeight: '600' },
  deleteBtn: {
    flex: 1, borderRadius: 8, paddingVertical: 8,
    alignItems: 'center',
  },
  deleteBtnText: { fontSize: 16 },

  // Empty
  empty: { alignItems: 'center', marginTop: 80 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '700', marginBottom: 6 },
  emptySub: { fontSize: 14 },

  // Modal
  modalOverlay: {
    flex: 1, justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalCard: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', padding: 20, borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 17, fontWeight: '700' },
  modalSub: { fontSize: 13, marginTop: 2 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
  },
  closeBtnText: { fontSize: 14 },
  modalBody: { padding: 20 },
  fieldGroup: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  fieldInput: {
    borderWidth: 1, borderRadius: 10,
    paddingHorizontal: 14, height: 48, fontSize: 15,
  },
  toggleRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', borderRadius: 12,
    padding: 14, borderWidth: 1, marginBottom: 20,
  },
  toggleLabel: { fontSize: 15, fontWeight: '600' },
  toggleSub: { fontSize: 12, marginTop: 2 },
  saveBtn: {
    borderRadius: 12, height: 52,
    justifyContent: 'center', alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});