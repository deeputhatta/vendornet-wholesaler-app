const fs = require('fs');
let c = fs.readFileSync('C:/Users/leksh/wholesaler-app/src/screens/DashboardScreen.js', 'utf8');

// Replace Quick Actions section with Order Pipeline + Recent Activity
const oldSection = `          {/* QUICK ACTIONS */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: c.text }]}>⚡ Quick Actions</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.actionsScroll}>
            {[
              can('view_orders') && { icon: '📦', label: 'Orders', color: '#0A84FF', bg: '#001830', screen: 'Orders', badge: stats?.pending },
              can('manage_listings') && { icon: '🏷', label: 'Inventory', color: '#F2C94C', bg: '#2A1F00', screen: 'Inventory' },
              can('view_analytics') && { icon: '📊', label: 'Analytics', color: '#30D158', bg: '#003A10', screen: 'Analytics' },
              can('upload_invoice') && { icon: '🧾', label: 'Invoice', color: '#BF5AF2', bg: '#1A0A2E', screen: 'Orders' },
              isAdmin && { icon: '👥', label: 'Staff', color: '#30B0C7', bg: '#001820', screen: 'Staff' },
              { icon: '🏷', label: 'Categories', color: '#FF9500', bg: '#2A1500', screen: 'CategoryPicker' },
              { icon: '👤', label: 'Profile', color: '#8E8E93', bg: '#1C1C1E', screen: 'Profile' },
            ].filter(Boolean).map((a,i) => (
              <TouchableOpacity key={i} style={[styles.actionCard, { backgroundColor: a.bg }]}
                onPress={() => navigation.navigate(a.screen)} activeOpacity={0.8}>
                <Text style={{ fontSize: 26, marginBottom: 6 }}>{a.icon}</Text>
                <Text style={[styles.actionLabel, { color: a.color }]}>{a.label}</Text>
                {a.badge > 0 && (
                  <View style={styles.actionBadge}>
                    <Text style={styles.actionBadgeText}>{a.badge}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>`;

const newSection = `          {/* ORDER STATUS PIPELINE */}
          {can('view_orders') && allOrders.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: c.text }]}>📊 Order Pipeline</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Orders')}>
                  <Text style={[styles.seeAll, { color: c.primary }]}>Manage →</Text>
                </TouchableOpacity>
              </View>
              <View style={[styles.pipelineCard, { backgroundColor: c.surface }]}>
                {[
                  { label: 'Pending', key: 'pending', color: '#F2C94C', icon: '⏳' },
                  { label: 'Accepted', key: 'accepted', color: '#1D9E75', icon: '✓' },
                  { label: 'Packing', key: 'packing', color: '#0A84FF', icon: '📦' },
                  { label: 'Dispatched', key: 'dispatched', color: '#F2C94C', icon: '🚚' },
                  { label: 'Delivered', key: 'delivered', color: '#30D158', icon: '✅' },
                ].map((stage, i, arr) => {
                  const count = allOrders.filter(o => o.status === stage.key ||
                    (stage.key === 'delivered' && ['delivered','completed','invoice_uploaded'].includes(o.status))
                  ).length;
                  const pct = allOrders.length > 0 ? Math.round((count/allOrders.length)*100) : 0;
                  return (
                    <View key={stage.key} style={styles.pipelineStage}>
                      <View style={[styles.pipelineIcon, { backgroundColor: count > 0 ? stage.color + '22' : c.surfaceSecondary||'#2C2C2E' }]}>
                        <Text style={{ fontSize: 16 }}>{stage.icon}</Text>
                      </View>
                      <Text style={[styles.pipelineCount, { color: count > 0 ? stage.color : c.textMuted }]}>{count}</Text>
                      <Text style={[styles.pipelineLabel, { color: c.textMuted }]}>{stage.label}</Text>
                      {i < arr.length-1 && <Text style={[styles.pipelineArrow, { color: c.borderLight }]}>→</Text>}
                    </View>
                  );
                })}
              </View>
            </>
          )}

          {/* 7-DAY REVENUE TREND */}
          {can('view_analytics') && allOrders.length > 0 && (
            <>
              <View style={[styles.sectionHeader, { marginTop: 16 }]}>
                <Text style={[styles.sectionTitle, { color: c.text }]}>📈 Last 7 Days</Text>
              </View>
              <View style={[styles.trendCard, { backgroundColor: c.surface }]}>
                {(() => {
                  const days = Array.from({ length: 7 }, (_, i) => {
                    const d = new Date();
                    d.setDate(d.getDate() - (6-i));
                    const key = d.toDateString();
                    const label = d.toLocaleDateString('en-IN', { weekday: 'short' });
                    const dayOrders = allOrders.filter(o => new Date(o.created_at).toDateString() === key);
                    const revenue = dayOrders.reduce((s,o) => s+parseFloat(o.total_amount||0),0);
                    return { label, count: dayOrders.length, revenue, isToday: i === 6 };
                  });
                  const maxRevenue = Math.max(...days.map(d => d.revenue), 1);
                  return (
                    <View style={styles.trendBars}>
                      {days.map((day, i) => (
                        <View key={i} style={styles.trendBarCol}>
                          {day.count > 0 && (
                            <Text style={[styles.trendCount, { color: day.isToday ? '#1D9E75' : c.textMuted }]}>
                              {day.count}
                            </Text>
                          )}
                          <View style={styles.trendBarWrapper}>
                            <View style={[styles.trendBar, {
                              height: day.revenue > 0 ? Math.max(8, (day.revenue/maxRevenue)*80) : 4,
                              backgroundColor: day.isToday ? '#1D9E75' : day.revenue > 0 ? c.primary : c.borderLight||'#3A3A3C',
                              opacity: day.isToday ? 1 : 0.7,
                            }]} />
                          </View>
                          <Text style={[styles.trendLabel, { color: day.isToday ? '#1D9E75' : c.textMuted, fontWeight: day.isToday ? '700' : '400' }]}>
                            {day.label}
                          </Text>
                        </View>
                      ))}
                    </View>
                  );
                })()}
              </View>
            </>
          )}`;

c = c.replace(oldSection, newSection);

// Add new styles
c = c.replace(
  `  alertCard: { marginHorizontal: 12, marginTop: 16, backgroundColor: '#2A1F00', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#BA7517' },`,
  `  pipelineCard: { marginHorizontal: 12, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'flex-start', elevation: 1, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3 },
  pipelineStage: { flex: 1, alignItems: 'center', position: 'relative' },
  pipelineIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  pipelineCount: { fontSize: 16, fontWeight: '800', marginBottom: 2 },
  pipelineLabel: { fontSize: 9, fontWeight: '600', textAlign: 'center' },
  pipelineArrow: { position: 'absolute', right: -4, top: 10, fontSize: 12 },
  trendCard: { marginHorizontal: 12, borderRadius: 14, padding: 14, elevation: 1, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3 },
  trendBars: { flexDirection: 'row', alignItems: 'flex-end', height: 110 },
  trendBarCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' },
  trendCount: { fontSize: 9, marginBottom: 2 },
  trendBarWrapper: { width: '60%', alignItems: 'center', justifyContent: 'flex-end', flex: 1 },
  trendBar: { width: '100%', borderRadius: 4 },
  trendLabel: { fontSize: 9, marginTop: 4 },
  alertCard: { marginHorizontal: 12, marginTop: 16, backgroundColor: '#2A1F00', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#BA7517' },`
);

// Remove unused styles
c = c.replace(`  actionsScroll: { paddingHorizontal: 12, gap: 10 },
  actionCard: { width: 80, height: 90, borderRadius: 14, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  actionLabel: { fontSize: 10, fontWeight: '700', textAlign: 'center' },
  actionBadge: { position: 'absolute', top: 6, right: 6, backgroundColor: '#F2C94C', borderRadius: 8, minWidth: 16, height: 16, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3 },
  actionBadgeText: { fontSize: 9, fontWeight: '800', color: '#000' },`, '');

fs.writeFileSync('C:/Users/leksh/wholesaler-app/src/screens/DashboardScreen.js', c);
console.log('Done');
console.log('pipeline found:', c.includes('pipelineCard'));
console.log('trendCard found:', c.includes('trendCard'));
