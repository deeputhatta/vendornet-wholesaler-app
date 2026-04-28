import React, { useState, useEffect } from 'react';
import { CommonActions } from '@react-navigation/native';
import { callbacks } from '../utils/callbacks';
import { appEvents } from '../utils/appEvents';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, TextInput
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../services/api';

const CATEGORY_CONFIG = {
  'Cement':      { icon: '🏗', color: '#e6f1fb', textColor: '#185FA5' },
  'Steel / TMT': { icon: '⚙️', color: '#e1f5ee', textColor: '#1D9E75' },
  'Paint':       { icon: '🎨', color: '#fdf4ff', textColor: '#9333ea' },
  'Electrical':  { icon: '⚡', color: '#fefce8', textColor: '#ca8a04' },
  'Plumbing':    { icon: '🔧', color: '#eff6ff', textColor: '#2563eb' },
  'Hardware':    { icon: '🔨', color: '#fff7ed', textColor: '#ea580c' },
  'Tiles':       { icon: '🪟', color: '#f0fdf4', textColor: '#16a34a' },
  'Power Tools': { icon: '🔌', color: '#fef2f2', textColor: '#dc2626' },
};

const DEFAULT_CONFIG = { icon: '📦', color: '#f8fafc', textColor: '#475569' };
const MAX_CATEGORIES = 5;

export default function CategoryPickerScreen({ navigation, route }) {
  const [categories, setCategories] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { theme } = useTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();

  const isOnboarding = route?.params?.isOnboarding || false;
  const userRole = route?.params?.userRole || '';
  const roleLabel = userRole.includes('wholesaler') ? 'supply' : 'buy';

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [allRes, myRes] = await Promise.all([
        api.get('/categories'),
        api.get('/categories/my').catch(() => ({ data: { categories: [] } })),
      ]);
      const cats = allRes.data.categories || [];
      // Add Others option
      if (!cats.find(cat => cat.name === 'Others')) {
        cats.push({ category_id: 'others', name: 'Others', slug: 'others' });
      }
      setCategories(cats);
      setSelected(myRes.data.categories?.map(cat => cat.category_id) || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const toggleCategory = (catId) => {
    setSelected(prev => {
      if (prev.includes(catId)) return prev.filter(id => id !== catId);
      if (prev.length >= MAX_CATEGORIES) {
        Alert.alert('Limit Reached', `You can select up to ${MAX_CATEGORIES} categories only.`);
        return prev;
      }
      return [...prev, catId];
    });
  };

  const save = async () => {
    if (selected.length === 0) {
      Alert.alert('Select Categories', 'Please select at least one category.');
      return;
    }
    setSaving(true);
    try {
      await api.put('/categories/my', { category_ids: selected.filter(id => id !== 'others').filter(id => id !== 'others').filter(id => id !== 'others') });
      if (isOnboarding) {
        if (callbacks.onCategoryDone) callbacks.onCategoryDone();
      } else {
        Alert.alert('Saved', 'Your categories have been updated.', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to save');
    } finally { setSaving(false); }
  };

  if (loading) return (
    <View style={[styles.loading, { backgroundColor: c.background }]}>
      <ActivityIndicator size="large" color={c.primary} />
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <View style={[styles.header, { backgroundColor: c.primary, paddingTop: insets.top + 16 }]}>
        {!isOnboarding && (
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.title}>My Categories</Text>
        <Text style={styles.subtitle}>Select up to {MAX_CATEGORIES} categories you {roleLabel} in</Text>
        {selected.length > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{selected.length} selected</Text>
          </View>
        )}
      </View>

      {/* Search bar */}
      <View style={[styles.searchBar, { backgroundColor: c.surface, borderBottomColor: c.border }]}>
        <View style={[styles.searchBox, { backgroundColor: c.surfaceSecondary, borderColor: c.border }]}>
          <Text style={{ fontSize: 16, marginRight: 8 }}>🔍</Text>
          <TextInput
            style={[styles.searchInput, { color: c.text, flex: 1 }]}
            placeholder="Search categories..."
            placeholderTextColor={c.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={{ fontSize: 14, color: c.textMuted, paddingHorizontal: 4 }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {categories.filter(cat => cat.name.toLowerCase().includes((searchQuery||'').toLowerCase())).map(cat => {
          const cfg = CATEGORY_CONFIG[cat.name] || DEFAULT_CONFIG;
          const isSelected = selected.includes(cat.category_id);
          return (
            <TouchableOpacity
              key={cat.category_id}
              style={[styles.tile, {
                backgroundColor: isSelected ? c.primary : c.surface,
                borderColor: isSelected ? c.primary : c.border,
              }]}
              onPress={() => toggleCategory(cat.category_id)}
              activeOpacity={0.75}>
              <View style={[styles.iconBox, { backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : cfg.color }]}>
                <Text style={styles.iconText}>{cfg.icon}</Text>
              </View>
              <Text style={[styles.tileName, { color: isSelected ? '#fff' : c.text }]} numberOfLines={1}>
                {cat.name}
              </Text>
              <View style={[styles.check, {
                backgroundColor: isSelected ? 'rgba(255,255,255,0.3)' : c.background,
                borderColor: isSelected ? 'transparent' : c.border,
              }]}>
                {isSelected && <Text style={styles.checkMark}>✓</Text>}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: c.surface, borderTopColor: c.border, paddingBottom: Math.max(insets.bottom, 8) }]}>
        <Text style={[styles.footerCount, { color: c.text }]}>{selected.length}/{MAX_CATEGORIES} selected</Text>
        <View style={styles.footerBtns}>
          {!isOnboarding && (
            <TouchableOpacity style={[styles.cancelBtn, { borderColor: c.border }]} onPress={() => navigation.goBack()}>
              <Text style={[styles.cancelBtnText, { color: c.textMuted }]}>Cancel</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: selected.length > 0 ? c.primary : c.border }]}
            onPress={save}
            disabled={saving || selected.length === 0}>
            {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>{isOnboarding ? 'Continue →' : 'Save'}</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 20 },
  backBtn: { marginBottom: 8 },
  backText: { color: 'rgba(255,255,255,0.75)', fontSize: 14 },
  title: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 4 },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  countBadge: { alignSelf: 'flex-start', marginTop: 10, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  countBadgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  searchBar: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1 },
  searchBox: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1 },
  searchInput: { fontSize: 14, paddingVertical: 0 },
  scroll: { flex: 1 },
  listContent: { padding: 12 },
  tile: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, marginBottom: 8, padding: 12, borderWidth: 1.5, gap: 12 },
  iconBox: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  iconText: { fontSize: 20 },
  tileName: { flex: 1, fontSize: 15, fontWeight: '600' },
  check: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  checkMark: { color: '#fff', fontSize: 12, fontWeight: '800' },
  footer: { paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  footerInfo: { flex: 1 },
  footerCount: { fontSize: 15, fontWeight: '800' },
  footerLabel: { fontSize: 11, marginTop: 1 },
  footerBtns: { flexDirection: 'row', gap: 8 },
  cancelBtn: { borderRadius: 10, height: 38, paddingHorizontal: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  cancelBtnText: { fontSize: 14, fontWeight: '600' },
  saveBtn: { borderRadius: 10, height: 38, paddingHorizontal: 18, justifyContent: 'center', alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});




