import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, RefreshControl, Alert,
  ScrollView, Modal, Dimensions, Keyboard
} from 'react-native';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { useFocusEffect } from '@react-navigation/native';

const { width } = Dimensions.get('window');
const CARD_W = (width - 48) / 2;

// ─── MAIN ───────────────────────────────────────────────────────────────────
export default function InventoryScreen() {
  const [tab, setTab] = useState(0);
  const [catalogue, setCatalogue] = useState([]);
  const [myListings, setMyListings] = useState({});
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { theme } = useTheme();
  const c = theme.colors;

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const loadData = async () => {
    try {
      const [catRes, myRes] = await Promise.all([
        api.get('/listings/catalogue'),
        api.get('/listings/my'),
      ]);
      setCatalogue(catRes.data.catalogue || []);
      setCategories(catRes.data.categories || []);
      const map = {};
      (myRes.data.listings || []).forEach(l => { map[l.variant_id] = l; });
      setMyListings(map);
    } catch (err) { console.error(err); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const listed = Object.keys(myListings).length;
  const lowStock = Object.values(myListings).filter(l => l.stock_qty < 10).length;

  if (loading) return (
    <View style={[s.center, { backgroundColor: c.background }]}>
      <ActivityIndicator size="large" color={c.primary} />
    </View>
  );

  return (
    <View style={[s.container, { backgroundColor: c.background }]}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: c.primary }]}>
        <View>
          <Text style={s.title}>Inventory</Text>
          <Text style={s.headerSub}>{listed} listed · {lowStock > 0 ? <Text style={{ color: '#FF9500' }}>{lowStock} low stock</Text> : 'all stocked'}</Text>
        </View>
        <TouchableOpacity style={s.addFab} onPress={() => setTab(1)}>
          <Text style={s.addFabText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={[s.tabRow, { backgroundColor: c.surface, borderBottomColor: c.border }]}>
        {[['📦', 'My Inventory'], ['➕', 'Add Products'], ['🆕', 'Request']].map(([icon, label], i) => (
          <TouchableOpacity key={i} style={[s.tabBtn, { borderBottomColor: tab === i ? c.primary : 'transparent' }]}
            onPress={() => setTab(i)}>
            <Text style={{ fontSize: 14 }}>{icon}</Text>
            <Text style={[s.tabText, { color: tab === i ? c.primary : c.textMuted, fontWeight: tab === i ? '700' : '400' }]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 0 && <MyInventoryTab catalogue={catalogue} myListings={myListings} categories={categories}
        onRefresh={() => { setRefreshing(true); loadData(); }} refreshing={refreshing} onSaved={loadData} theme={theme} />}
      {tab === 1 && <AddProductsTab catalogue={catalogue} myListings={myListings} categories={categories}
        onAdded={() => { loadData(); setTab(0); }} theme={theme} />}
      {tab === 2 && <RequestNewTab categories={categories} theme={theme} />}
    </View>
  );
}

// ─── MY INVENTORY ────────────────────────────────────────────────────────────
function MyInventoryTab({ catalogue, myListings, categories, onRefresh, refreshing, onSaved, theme }) {
  const c = theme.colors;
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [editing, setEditing] = useState(null); // variant_id being edited
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  const listed = catalogue.filter(item => {
    if (!myListings[item.variant_id]) return false;
    const matchCat = !catFilter || item.category_id === catFilter;
    const matchSearch = !search ||
      item.generic_name?.toLowerCase().includes(search.toLowerCase()) ||
      item.brand_name?.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const openEdit = (item) => {
    const l = myListings[item.variant_id];
    setEditForm({
      price: String(l.price || ''),
      offer_price: String(l.offer_price || ''),
      min_order_qty: String(l.min_order_qty || '1'),
      stock_qty: String(l.stock_qty || '0'),
      delivery_days: String(l.delivery_days || '1'),
    });
    setEditing(item.variant_id);
  };

  const saveEdit = async () => {
    const listing = myListings[editing];
    setSaving(true);
    try {
      await api.put(`/listings/${listing.listing_id}`, {
        price: parseFloat(editForm.price),
        offer_price: editForm.offer_price ? parseFloat(editForm.offer_price) : null,
        min_order_qty: parseInt(editForm.min_order_qty) || 1,
        stock_qty: parseInt(editForm.stock_qty) || 0,
        delivery_days: parseInt(editForm.delivery_days) || 1,
        is_active: listing.is_active,
      });
      setEditing(null);
      await onSaved();
    } catch { Alert.alert('Error', 'Failed to save'); }
    finally { setSaving(false); }
  };

  const renderItem = ({ item }) => {
    const l = myListings[item.variant_id];
    const isLow = l.stock_qty < 10;
    const isEditing = editing === item.variant_id;

    return (
      <View style={[s.listingCard, { backgroundColor: c.surface }]}>
        {/* Product info */}
        <View style={s.listingTop}>
          <View style={[s.listingIcon, { backgroundColor: c.primaryLight }]}>
            <Text style={{ fontSize: 18 }}>📦</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.listingName, { color: c.text }]} numberOfLines={1}>{item.generic_name}</Text>
            <Text style={[s.listingBrand, { color: c.primary }]}>{item.brand_name}</Text>
            {item.attributes?.grade && <Text style={[s.listingAttr, { color: c.textMuted }]}>{item.attributes.grade}</Text>}
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[s.listingPrice, { color: '#F2C94C' }]}>₹{parseFloat(l.price).toLocaleString('en-IN')}</Text>
            {l.offer_price ? <Text style={[s.listingOffer, { color: '#30D158' }]}>₹{parseFloat(l.offer_price).toLocaleString('en-IN')}</Text> : null}
          </View>
        </View>

        {/* Stats row */}
        {!isEditing && (
          <View style={[s.statsRow, { borderTopColor: c.borderLight }]}>
            <StatPill label="MOQ" value={l.min_order_qty} theme={theme} />
            <StatPill label="Stock" value={l.stock_qty} theme={theme} warn={isLow} />
            <StatPill label="Days" value={l.delivery_days} theme={theme} />
            <TouchableOpacity style={[s.editPill, { backgroundColor: c.primaryLight }]} onPress={() => openEdit(item)}>
              <Text style={[{ color: c.primary, fontSize: 12, fontWeight: '700' }]}>✏ Edit</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Edit form - inline */}
        {isEditing && (
          <View style={[s.editForm, { borderTopColor: c.borderLight }]}>
            <View style={s.editRow}>
              <EditField label="Price ₹" value={editForm.price} onEdit={v => setEditForm(f => ({ ...f, price: v }))} theme={theme} />
              <EditField label="Offer ₹" value={editForm.offer_price} onEdit={v => setEditForm(f => ({ ...f, offer_price: v }))} theme={theme} />
              <EditField label="MOQ" value={editForm.min_order_qty} onEdit={v => setEditForm(f => ({ ...f, min_order_qty: v }))} theme={theme} />
              <EditField label="Stock" value={editForm.stock_qty} onEdit={v => setEditForm(f => ({ ...f, stock_qty: v }))} theme={theme} />
              <EditField label="Days" value={editForm.delivery_days} onEdit={v => setEditForm(f => ({ ...f, delivery_days: v }))} theme={theme} />
            </View>
            <View style={s.editActions}>
              <TouchableOpacity style={[s.cancelBtn, { backgroundColor: c.surfaceSecondary }]} onPress={() => setEditing(null)}>
                <Text style={{ color: c.textMuted, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.saveBtn2, { backgroundColor: c.primary, opacity: saving ? 0.6 : 1 }]}
                onPress={saveEdit} disabled={saving}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>{saving ? 'Saving...' : '💾 Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Search */}
      <View style={[s.searchBar, { backgroundColor: c.surface }]}>
        <Text style={{ fontSize: 14, marginRight: 8 }}>🔍</Text>
        <TextInput style={[s.searchInput, { color: c.text }]}
          placeholder="Search product or brand..." placeholderTextColor={c.textMuted}
          value={search} onChangeText={setSearch} />
        {search ? <TouchableOpacity onPress={() => setSearch('')}><Text style={{ color: c.textMuted }}>✕</Text></TouchableOpacity> : null}
      </View>

      {/* Category chips - single row horizontal scroll */}
      <View style={{ borderBottomWidth: 1, borderBottomColor: c.border }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.catBarContent}>
          <CategoryChip label="All" active={!catFilter} onPress={() => setCatFilter('')} theme={theme} />
          {categories.map(cat => (
            <CategoryChip key={cat.category_id} label={cat.name} active={catFilter === cat.category_id}
              onPress={() => setCatFilter(catFilter === cat.category_id ? '' : cat.category_id)} theme={theme} />
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={listed}
        keyExtractor={item => item.variant_id}
        contentContainerStyle={{ padding: 12, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
        renderItem={renderItem}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>🏷</Text>
            <Text style={[s.emptyTitle, { color: theme.colors.text }]}>No listings found</Text>
            <Text style={[s.emptySub, { color: theme.colors.textMuted }]}>Switch to "Add Products" to start</Text>
          </View>
        }
      />
    </View>
  );
}

function StatPill({ label, value, theme, warn }) {
  const c = theme.colors;
  return (
    <View style={[s.statPill, { backgroundColor: warn ? '#2A1500' : c.surfaceSecondary }]}>
      <Text style={[s.statPillLabel, { color: c.textMuted }]}>{label}</Text>
      <Text style={[s.statPillValue, { color: warn ? '#FF9500' : c.text }]}>{value}</Text>
    </View>
  );
}

function EditField({ label, value, onEdit, theme }) {
  const c = theme.colors;
  return (
    <View style={s.editFieldWrap}>
      <Text style={[s.editFieldLabel, { color: c.textMuted }]}>{label}</Text>
      <TextInput style={[s.editFieldInput, { backgroundColor: c.surfaceSecondary, color: c.text, borderColor: value ? c.primary : c.border }]}
        value={value} onChangeText={onEdit} keyboardType="numeric" />
    </View>
  );
}

// ─── ADD PRODUCTS ────────────────────────────────────────────────────────────
function AddProductsTab({ catalogue, myListings, categories, onAdded, theme }) {
  const c = theme.colors;
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [selected, setSelected] = useState(null); // variant_id
  const [priceModal, setPriceModal] = useState(false);
  const [form, setForm] = useState({ price: '', offer_price: '', min_order_qty: '1', stock_qty: '0', delivery_days: '1' });
  const [saving, setSaving] = useState(false);
  const [addedIds, setAddedIds] = useState([]);

  const unlisted = catalogue.filter(item => {
    if (myListings[item.variant_id] || addedIds.includes(item.variant_id)) return false;
    const matchCat = !catFilter || item.category_id === catFilter;
    const matchSearch = !search ||
      item.generic_name?.toLowerCase().includes(search.toLowerCase()) ||
      item.brand_name?.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const grouped = {};
  unlisted.forEach(item => {
    if (!grouped[item.product_id]) grouped[item.product_id] = { ...item, variants: [] };
    grouped[item.product_id].variants.push(item);
  });

  const openPriceModal = (variantId) => {
    setSelected(variantId);
    setForm({ price: '', offer_price: '', min_order_qty: '1', stock_qty: '0', delivery_days: '1' });
    setPriceModal(true);
  };

  const addToInventory = async () => {
    if (!form.price) return Alert.alert('Required', 'Enter price');
    setSaving(true);
    try {
      await api.post('/listings/upsert', {
        variant_id: selected,
        price: parseFloat(form.price),
        offer_price: form.offer_price ? parseFloat(form.offer_price) : null,
        min_order_qty: parseInt(form.min_order_qty) || 1,
        stock_qty: parseInt(form.stock_qty) || 0,
        delivery_days: parseInt(form.delivery_days) || 1,
        delivery_radius_km: 20,
      });
      setAddedIds(prev => [...prev, selected]);
      setPriceModal(false);
      setSelected(null);
      onAdded();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to add');
    } finally { setSaving(false); }
  };

  const selectedItem = catalogue.find(c => c.variant_id === selected);

  return (
    <View style={{ flex: 1 }}>
      {/* Search */}
      <View style={[s.searchBar, { backgroundColor: c.surface }]}>
        <Text style={{ fontSize: 14, marginRight: 8 }}>🔍</Text>
        <TextInput style={[s.searchInput, { color: c.text }]}
          placeholder="Search product or brand..." placeholderTextColor={c.textMuted}
          value={search} onChangeText={setSearch} />
        {search ? <TouchableOpacity onPress={() => setSearch('')}><Text style={{ color: c.textMuted }}>✕</Text></TouchableOpacity> : null}
      </View>

      {/* Category chips */}
      <View style={{ borderBottomWidth: 1, borderBottomColor: c.border }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.catBarContent}>
          <CategoryChip label="All" active={!catFilter} onPress={() => setCatFilter('')} theme={theme} />
          {categories.map(cat => (
            <CategoryChip key={cat.category_id} label={cat.name} active={catFilter === cat.category_id}
              onPress={() => setCatFilter(catFilter === cat.category_id ? '' : cat.category_id)} theme={theme} />
          ))}
        </ScrollView>
      </View>

      {/* Hint */}
      <View style={[s.hintBar, { backgroundColor: '#0A1F35' }]}>
        <Text style={{ color: '#64B5F6', fontSize: 12 }}>💡 Tap "+" on any product to set price and add to inventory</Text>
      </View>

      <FlatList
        data={Object.values(grouped)}
        keyExtractor={item => item.product_id}
        contentContainerStyle={{ padding: 12, paddingBottom: 32 }}
        renderItem={({ item: group }) => (
          <View style={[s.productGroup, { backgroundColor: c.surface }]}>
            {/* Product header */}
            <View style={[s.groupHeader, { borderBottomColor: c.borderLight }]}>
              <View style={[s.groupIcon, { backgroundColor: c.primaryLight }]}>
                <Text style={{ fontSize: 16 }}>📦</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.groupName, { color: c.text }]}>{group.generic_name}</Text>
                <Text style={[s.groupCat, { color: c.primary }]}>{group.category_name} · HSN: {group.hsn_code || '—'}</Text>
              </View>
            </View>

            {/* Variants */}
            {group.variants.map(item => (
              <View key={item.variant_id} style={[s.variantRow, { borderBottomColor: c.borderLight }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[s.variantBrand, { color: c.text }]}>{item.brand_name}</Text>
                  <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 3 }}>
                    {item.attributes?.grade && <AttrTag label={item.attributes.grade} theme={theme} />}
                    {item.attributes?.weight_kg && <AttrTag label={`${item.attributes.weight_kg}kg`} theme={theme} />}
                  </View>
                </View>
                <TouchableOpacity style={[s.addBtn, { backgroundColor: c.primary }]}
                  onPress={() => openPriceModal(item.variant_id)}>
                  <Text style={s.addBtnText}>+ Add</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>🎉</Text>
            <Text style={[s.emptyTitle, { color: theme.colors.text }]}>All products listed!</Text>
          </View>
        }
      />

      {/* Price Modal */}
      <Modal visible={priceModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={[s.priceModal, { backgroundColor: c.surface }]}>
            <View style={s.modalHandle} />
            <Text style={[s.modalTitle, { color: c.text }]}>Set Price & Stock</Text>
            {selectedItem && (
              <View style={[s.selectedBadge, { backgroundColor: c.primaryLight }]}>
                <Text style={[{ color: c.primary, fontWeight: '700', fontSize: 13 }]}>{selectedItem.generic_name}</Text>
                <Text style={[{ color: c.primary, fontSize: 11 }]}>{selectedItem.brand_name}</Text>
              </View>
            )}

            <View style={s.priceGrid}>
              <PriceField label="Price ₹ *" value={form.price} onEdit={v => setForm(f => ({ ...f, price: v }))} theme={theme} mandatory />
              <PriceField label="Offer ₹" value={form.offer_price} onEdit={v => setForm(f => ({ ...f, offer_price: v }))} theme={theme} />
              <PriceField label="Min Qty" value={form.min_order_qty} onEdit={v => setForm(f => ({ ...f, min_order_qty: v }))} theme={theme} mandatory />
              <PriceField label="Stock" value={form.stock_qty} onEdit={v => setForm(f => ({ ...f, stock_qty: v }))} theme={theme} mandatory />
              <PriceField label="Days" value={form.delivery_days} onEdit={v => setForm(f => ({ ...f, delivery_days: v }))} theme={theme} mandatory />
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
              <TouchableOpacity style={[s.modalCancelBtn, { backgroundColor: c.surfaceSecondary }]}
                onPress={() => { setPriceModal(false); setSelected(null); }}>
                <Text style={[{ color: c.textMuted, fontWeight: '600', fontSize: 14 }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.modalSaveBtn, { backgroundColor: c.primary, opacity: saving ? 0.6 : 1 }]}
                onPress={addToInventory} disabled={saving}>
                <Text style={[{ color: '#fff', fontWeight: '700', fontSize: 14 }]}>
                  {saving ? 'Adding...' : '✓ Add to Inventory'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function AttrTag({ label, theme }) {
  return (
    <View style={[s.attrTag, { backgroundColor: theme.colors.surfaceSecondary }]}>
      <Text style={[s.attrTagText, { color: theme.colors.textMuted }]}>{label}</Text>
    </View>
  );
}

function PriceField({ label, value, onEdit, theme, mandatory }) {
  const c = theme.colors;
  const filled = !!value;
  return (
    <View style={s.priceFieldWrap}>
      <Text style={[s.priceFieldLabel, { color: filled ? c.primary : mandatory ? '#FF9500' : c.textMuted }]}>{label}</Text>
      <TextInput
        style={[s.priceFieldInput, {
          backgroundColor: filled ? '#003A10' : c.surfaceSecondary,
          color: filled ? '#30D158' : c.text,
          borderColor: filled ? '#30D158' : mandatory ? '#FF9500' : c.border,
        }]}
        value={value} onChangeText={onEdit} keyboardType="numeric"
        placeholder="—" placeholderTextColor={c.textMuted} />
    </View>
  );
}

// ─── REQUEST NEW ─────────────────────────────────────────────────────────────
function RequestNewTab({ categories, theme }) {
  const c = theme.colors;
  const [subTab, setSubTab] = useState(0);
  const [products, setProducts] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [brandForm, setBrandForm] = useState({ product_id: '', brand_name: '', manufacturer: '' });
  const [productForm, setProductForm] = useState({ generic_name: '', category_id: '', hsn_code: '', tax_percentage: '', primary_unit: '', brand_name: '', manufacturer: '' });
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [productSearch, setProductSearch] = useState('');

  useEffect(() => {
    api.get('/listings/catalogue').then(res => {
      const cat = res.data.catalogue || [];
      const map = {};
      cat.forEach(item => { if (!map[item.product_id]) map[item.product_id] = { product_id: item.product_id, generic_name: item.generic_name, hsn_code: item.hsn_code }; });
      setProducts(Object.values(map));
    }).catch(console.error);
    api.get('/listings/my-requests').then(res => setMyRequests(res.data.requests || [])).catch(() => {});
  }, []);

  const filteredProducts = products.filter(p => !productSearch || p.generic_name?.toLowerCase().includes(productSearch.toLowerCase()));
  const selectedProduct = products.find(p => p.product_id === brandForm.product_id);

  const submitBrand = async () => {
    if (!brandForm.product_id) return setError('Select a product');
    if (!brandForm.brand_name) return setError('Brand name required');
    setSaving(true); setError(''); setSuccess('');
    try {
      await api.post('/listings/request-variant', { product_id: brandForm.product_id, brand_name: brandForm.brand_name, manufacturer: brandForm.manufacturer, attributes: {} });
      setSuccess('Brand added to catalogue instantly!');
      setBrandForm({ product_id: '', brand_name: '', manufacturer: '' });
    } catch (err) { setError(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  };

  const submitProduct = async () => {
    if (!productForm.generic_name) return setError('Product name required');
    if (!productForm.hsn_code) return setError('HSN Code is mandatory');
    if (!productForm.brand_name) return setError('Brand name required');
    setSaving(true); setError(''); setSuccess('');
    try {
      await api.post('/listings/request-variant', { generic_name: productForm.generic_name, category_id: productForm.category_id || null, hsn_code: productForm.hsn_code, tax_percentage: parseFloat(productForm.tax_percentage) || 0, primary_unit: productForm.primary_unit || null, brand_name: productForm.brand_name, manufacturer: productForm.manufacturer || null, attributes: {} });
      setSuccess('Product request submitted! Admin will review.');
      setProductForm({ generic_name: '', category_id: '', hsn_code: '', tax_percentage: '', primary_unit: '', brand_name: '', manufacturer: '' });
    } catch (err) { setError(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      {/* Sub tabs */}
      <View style={[s.subTabRow, { backgroundColor: c.surfaceSecondary }]}>
        {['New Brand', 'New Product', `My Requests (${myRequests.length})`].map((t, i) => (
          <TouchableOpacity key={i} style={[s.subTabBtn, { backgroundColor: subTab === i ? c.primary : 'transparent' }]}
            onPress={() => { setSubTab(i); setError(''); setSuccess(''); }}>
            <Text style={[s.subTabText, { color: subTab === i ? '#fff' : c.textMuted }]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {error ? <View style={[s.alertBox, { backgroundColor: '#2A0A0A', borderColor: '#FF453A' }]}><Text style={{ color: '#FF453A', fontSize: 13 }}>{error}</Text></View> : null}
      {success ? <View style={[s.alertBox, { backgroundColor: '#003A10', borderColor: '#1D9E75' }]}><Text style={{ color: '#30D158', fontSize: 13 }}>✓ {success}</Text></View> : null}

      {subTab === 0 && (
        <View style={[s.formCard, { backgroundColor: c.surface }]}>
          <Text style={[s.formCardTitle, { color: c.text }]}>Add new brand to existing product</Text>
          <Text style={[s.formCardHint, { color: c.textMuted }]}>Product already exists — your brand is not listed yet</Text>

          {/* Product selector */}
          <Text style={[s.fieldLabel2, { color: c.textMuted }]}>Select Product *</Text>
          <TouchableOpacity style={[s.selectorBtn, { backgroundColor: c.surfaceSecondary, borderColor: brandForm.product_id ? c.primary : c.border }]}
            onPress={() => setShowProductPicker(true)}>
            <Text style={[{ flex: 1, fontSize: 14 }, { color: selectedProduct ? c.text : c.textMuted }]}>
              {selectedProduct ? selectedProduct.generic_name : 'Tap to select product...'}
            </Text>
            <Text style={{ color: c.textMuted }}>▼</Text>
          </TouchableOpacity>

          <RField label="Brand Name *" value={brandForm.brand_name} onEdit={v => setBrandForm(f => ({ ...f, brand_name: v }))} placeholder="e.g. Zuari, Ambuja" theme={theme} />
          <RField label="Manufacturer" value={brandForm.manufacturer} onEdit={v => setBrandForm(f => ({ ...f, manufacturer: v }))} placeholder="e.g. Zuari Cement Ltd" theme={theme} />

          <TouchableOpacity style={[s.submitBtn2, { backgroundColor: c.primary, opacity: saving ? 0.6 : 1 }]}
            onPress={submitBrand} disabled={saving}>
            <Text style={s.submitBtnText2}>{saving ? 'Adding...' : '+ Add Brand to Catalogue'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {subTab === 1 && (
        <View style={[s.formCard, { backgroundColor: c.surface }]}>
          <Text style={[s.formCardTitle, { color: c.text }]}>Request new product</Text>
          <Text style={[s.formCardHint, { color: c.textMuted }]}>Product doesn't exist yet. HSN Code is mandatory.</Text>

          <RField label="Product Name *" value={productForm.generic_name} onEdit={v => setProductForm(f => ({ ...f, generic_name: v }))} placeholder="e.g. White Cement, AAC Block" theme={theme} />
          <RField label="HSN Code *" value={productForm.hsn_code} onEdit={v => setProductForm(f => ({ ...f, hsn_code: v }))} placeholder="e.g. 2523" theme={theme} keyboardType="numeric" />

          <Text style={[s.fieldLabel2, { color: c.textMuted }]}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            {categories.map(cat => (
              <TouchableOpacity key={cat.category_id}
                style={[s.catChipSm, { backgroundColor: productForm.category_id === cat.category_id ? c.primary : c.surfaceSecondary }]}
                onPress={() => setProductForm(f => ({ ...f, category_id: f.category_id === cat.category_id ? '' : cat.category_id }))}>
                <Text style={[{ fontSize: 12, fontWeight: '600' }, { color: productForm.category_id === cat.category_id ? '#fff' : c.textMuted }]}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <RField label="Tax %" value={productForm.tax_percentage} onEdit={v => setProductForm(f => ({ ...f, tax_percentage: v }))} placeholder="e.g. 18" theme={theme} keyboardType="numeric" />
            </View>
            <View style={{ flex: 1 }}>
              <RField label="Primary Unit" value={productForm.primary_unit} onEdit={v => setProductForm(f => ({ ...f, primary_unit: v }))} placeholder="bag, kg..." theme={theme} />
            </View>
          </View>

          <View style={[s.divider, { backgroundColor: c.borderLight }]} />
          <Text style={[s.fieldLabel2, { color: c.textMuted, marginBottom: 12 }]}>BRAND DETAILS</Text>

          <RField label="Brand Name *" value={productForm.brand_name} onEdit={v => setProductForm(f => ({ ...f, brand_name: v }))} placeholder="e.g. Zuari" theme={theme} />
          <RField label="Manufacturer" value={productForm.manufacturer} onEdit={v => setProductForm(f => ({ ...f, manufacturer: v }))} placeholder="e.g. Zuari Cement Ltd" theme={theme} />

          <TouchableOpacity style={[s.submitBtn2, { backgroundColor: '#185FA5', opacity: saving ? 0.6 : 1 }]}
            onPress={submitProduct} disabled={saving}>
            <Text style={s.submitBtnText2}>{saving ? 'Submitting...' : '📤 Submit Request'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {subTab === 2 && (
        myRequests.length === 0 ? (
          <View style={s.empty}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>📋</Text>
            <Text style={[s.emptyTitle, { color: c.text }]}>No requests yet</Text>
          </View>
        ) : myRequests.map(r => {
          const sc = { approved: { color: '#30D158', bg: '#003A10' }, rejected: { color: '#FF453A', bg: '#2A0A0A' }, pending: { color: '#FF9500', bg: '#2A1500' } }[r.request_status] || { color: '#FF9500', bg: '#2A1500' };
          return (
            <View key={r.variant_id} style={[s.requestCard, { backgroundColor: c.surface }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Text style={[{ color: c.text, fontWeight: '700', fontSize: 14 }]}>{r.generic_name}</Text>
                  <Text style={[{ color: c.primary, fontSize: 12, marginTop: 2 }]}>{r.brand_name}</Text>
                </View>
                <View style={[{ borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: sc.bg }]}>
                  <Text style={[{ color: sc.color, fontSize: 11, fontWeight: '700' }]}>{r.request_status?.toUpperCase()}</Text>
                </View>
              </View>
              {r.rejection_reason && <Text style={{ color: '#FF453A', fontSize: 12, marginTop: 8 }}>Reason: {r.rejection_reason}</Text>}
              <Text style={{ color: c.textMuted, fontSize: 11, marginTop: 8 }}>{new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
            </View>
          );
        })
      )}

      {/* Product picker modal */}
      <Modal visible={showProductPicker} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={[s.pickerModal, { backgroundColor: c.surface }]}>
            <View style={s.modalHandle} />
            <Text style={[s.modalTitle, { color: c.text }]}>Select Product</Text>
            <View style={[s.searchBar, { backgroundColor: c.surfaceSecondary, marginBottom: 12 }]}>
              <Text style={{ marginRight: 8 }}>🔍</Text>
              <TextInput style={[s.searchInput, { color: c.text }]}
                placeholder="Search..." placeholderTextColor={c.textMuted}
                value={productSearch} onChangeText={setProductSearch} autoFocus />
            </View>
            <FlatList
              data={filteredProducts}
              keyExtractor={item => item.product_id}
              style={{ maxHeight: 340 }}
              renderItem={({ item }) => (
                <TouchableOpacity style={[s.pickerItem, { borderBottomColor: c.borderLight, backgroundColor: brandForm.product_id === item.product_id ? '#0A1F35' : 'transparent' }]}
                  onPress={() => { setBrandForm(f => ({ ...f, product_id: item.product_id })); setShowProductPicker(false); setProductSearch(''); }}>
                  <Text style={[{ color: c.text, fontSize: 14, fontWeight: '500' }]}>{item.generic_name}</Text>
                  {item.hsn_code && <Text style={[{ color: c.textMuted, fontSize: 11, marginTop: 2 }]}>HSN: {item.hsn_code}</Text>}
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={[s.modalCancelBtn, { backgroundColor: c.surfaceSecondary, marginTop: 12 }]}
              onPress={() => { setShowProductPicker(false); setProductSearch(''); }}>
              <Text style={{ color: c.textMuted, fontWeight: '600' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function RField({ label, value, onEdit, placeholder, theme, keyboardType }) {
  const c = theme.colors;
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={[s.fieldLabel2, { color: c.textMuted }]}>{label}</Text>
      <TextInput style={[s.rInput, { backgroundColor: c.surfaceSecondary, color: c.text, borderColor: value ? c.primary : c.border }]}
        value={value} onChangeText={onEdit} placeholder={placeholder} placeholderTextColor={c.textMuted}
        keyboardType={keyboardType || 'default'} />
    </View>
  );
}

function CategoryChip({ label, active, onPress, theme }) {
  return (
    <TouchableOpacity style={[s.catChipSm, { backgroundColor: active ? theme.colors.primary : theme.colors.surfaceSecondary }]} onPress={onPress}>
      <Text style={[s.catChipSmText, { color: active ? '#fff' : theme.colors.textMuted }]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingTop: 52, paddingHorizontal: 20, paddingBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  addFab: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 7 },
  addFabText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  tabRow: { flexDirection: 'row', borderBottomWidth: 1 },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2, gap: 2 },
  tabText: { fontSize: 11 },

  searchBar: { flexDirection: 'row', alignItems: 'center', margin: 12, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  searchInput: { flex: 1, fontSize: 14 },
  catBar: { borderBottomWidth: 1 },
  catBarContent: { paddingHorizontal: 12, paddingVertical: 8, gap: 8, flexDirection: 'row', alignItems: 'center' },
  catChipSm: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, marginRight: 4 },
  catChipSmText: { fontSize: 12, fontWeight: '600' },
  hintBar: { paddingHorizontal: 16, paddingVertical: 8 },

  // Listing card
  listingCard: { borderRadius: 14, marginBottom: 10, overflow: 'hidden' },
  listingTop: { flexDirection: 'row', alignItems: 'flex-start', padding: 14, gap: 10 },
  listingIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  listingName: { fontSize: 14, fontWeight: '700' },
  listingBrand: { fontSize: 12, marginTop: 2 },
  listingAttr: { fontSize: 10, marginTop: 1 },
  listingPrice: { fontSize: 16, fontWeight: '800' },
  listingOffer: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  statsRow: { flexDirection: 'row', padding: 10, gap: 6, borderTopWidth: 0.5, alignItems: 'center' },
  statPill: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, alignItems: 'center', minWidth: 48 },
  statPillLabel: { fontSize: 9, fontWeight: '600', textTransform: 'uppercase' },
  statPillValue: { fontSize: 13, fontWeight: '700', marginTop: 1 },
  editPill: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5, marginLeft: 'auto' },

  editForm: { padding: 12, borderTopWidth: 0.5 },
  editRow: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  editFieldWrap: { flex: 1 },
  editFieldLabel: { fontSize: 9, fontWeight: '600', textTransform: 'uppercase', marginBottom: 4 },
  editFieldInput: { borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 7, fontSize: 13, fontWeight: '600', textAlign: 'center' },
  editActions: { flexDirection: 'row', gap: 8 },
  cancelBtn: { flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  saveBtn2: { flex: 2, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },

  // Add products
  productGroup: { borderRadius: 14, marginBottom: 12, overflow: 'hidden' },
  groupHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10, borderBottomWidth: 0.5 },
  groupIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  groupName: { fontSize: 14, fontWeight: '700' },
  groupCat: { fontSize: 11, marginTop: 2 },
  variantRow: { flexDirection: 'row', alignItems: 'center', padding: 12, paddingHorizontal: 14, borderBottomWidth: 0.5 },
  variantBrand: { fontSize: 13, fontWeight: '600' },
  attrTag: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  attrTagText: { fontSize: 10 },
  addBtn: { borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
  addBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },

  // Price modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  priceModal: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  pickerModal: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#3A3A3C', alignSelf: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '800', marginBottom: 14 },
  selectedBadge: { borderRadius: 10, padding: 10, marginBottom: 16 },
  priceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  priceFieldWrap: { width: (width - 80) / 3 },
  priceFieldLabel: { fontSize: 10, fontWeight: '700', marginBottom: 5 },
  priceFieldInput: { borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 10, fontSize: 15, fontWeight: '700', textAlign: 'center' },
  modalCancelBtn: { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  modalSaveBtn: { flex: 2, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },

  // Request new
  subTabRow: { flexDirection: 'row', borderRadius: 12, marginBottom: 16, padding: 3 },
  subTabBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  subTabText: { fontSize: 11, fontWeight: '600' },
  formCard: { borderRadius: 16, padding: 18, marginBottom: 16 },
  formCardTitle: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
  formCardHint: { fontSize: 12, marginBottom: 16 },
  fieldLabel2: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 6 },
  selectorBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 12, padding: 13, marginBottom: 14 },
  rInput: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14 },
  divider: { height: 1, marginVertical: 16 },
  submitBtn2: { borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  submitBtnText2: { color: '#fff', fontWeight: '800', fontSize: 15 },

  // Request cards
  requestCard: { borderRadius: 14, padding: 16, marginBottom: 10 },
  pickerItem: { paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 0.5 },

  alertBox: { borderRadius: 10, padding: 12, marginBottom: 14, borderWidth: 1 },

  empty: { alignItems: 'center', marginTop: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 6 },
  emptySub: { fontSize: 14 },
});
