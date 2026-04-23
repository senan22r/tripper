import { useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FormField } from '../components/ui/form-field';
import { PrimaryButton } from '../components/ui/primary-button';
import { ScreenHeader } from '../components/ui/screen-header';
import { FONT, RADIUS, SPACING } from '../constants/theme';
import { useData } from '../context/data-context';
import { useTheme } from '../context/theme-context';
import type { Target } from '../db/schema';

type PeriodType = 'weekly' | 'monthly' | 'trip';

function labelForTarget(t: Target, categoryName?: string, tripName?: string) {
  const scope = t.categoryId ? `Category: ${categoryName ?? 'Unknown'}` : t.tripId ? `Trip: ${tripName ?? 'Unknown'}` : 'Global';
  return `${t.periodType.toUpperCase()} · ${scope}`;
}

export default function TargetsScreen() {
  const { palette } = useTheme();
  const { targets, categories, trips, addTarget, updateTarget, deleteTarget, activities } = useData();

  const categoryById = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c])), [categories]);
  const tripById = useMemo(() => Object.fromEntries(trips.map((t) => [t.id, t])), [trips]);

  const [periodType, setPeriodType] = useState<PeriodType>('weekly');
  const [scope, setScope] = useState<'global' | 'category' | 'trip'>('global');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [tripId, setTripId] = useState<number | null>(null);
  const [amount, setAmount] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [active, setActive] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const editing = useMemo(() => targets.find((t) => t.id === editingId) ?? null, [targets, editingId]);

  const resetForm = () => {
    setEditingId(null);
    setPeriodType('weekly');
    setScope('global');
    setCategoryId(null);
    setTripId(null);
    setAmount('');
    setStartDate(new Date().toISOString().slice(0, 10));
    setActive(true);
  };

  const beginEdit = (t: Target) => {
    setEditingId(t.id);
    setPeriodType(t.periodType as PeriodType);
    setActive(!!t.active);
    setAmount(String(t.targetAmount));
    setStartDate(t.startDate);
    if (t.categoryId) {
      setScope('category');
      setCategoryId(t.categoryId);
      setTripId(null);
    } else if (t.tripId) {
      setScope('trip');
      setTripId(t.tripId);
      setCategoryId(null);
    } else {
      setScope('global');
      setCategoryId(null);
      setTripId(null);
    }
  };

  const save = async () => {
    const targetAmount = Number(amount);
    if (!Number.isFinite(targetAmount) || targetAmount <= 0) return Alert.alert('Invalid amount', 'Enter a positive number.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate.trim())) return Alert.alert('Invalid date', 'Use YYYY-MM-DD.');
    if (scope === 'category' && !categoryId) return Alert.alert('Missing category', 'Choose a category scope.');
    if (scope === 'trip' && !tripId) return Alert.alert('Missing trip', 'Choose a trip scope.');

    const payload = {
      periodType,
      targetAmount,
      startDate: startDate.trim(),
      endDate: null as string | null,
      active,
      categoryId: scope === 'category' ? categoryId : null,
      tripId: scope === 'trip' ? tripId : null,
    };

    setSaving(true);
    try {
      if (editing) {
        await updateTarget(editing.id, payload);
      } else {
        await addTarget(payload);
      }
      resetForm();
    } catch {
      Alert.alert('Save failed', 'Could not save target.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (id: number) => {
    Alert.alert('Delete target?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteTarget(id);
            if (editingId === id) resetForm();
          } catch {
            Alert.alert('Delete failed', 'Could not delete target.');
          }
        },
      },
    ]);
  };

  const totalSpend = useMemo(() => activities.reduce((s, a) => s + a.amount, 0), [activities]);

  const progressByTargetId = useMemo(() => {
    const today = new Date();
    const todayIso = today.toISOString().slice(0, 10);
    const startOfWeek = () => {
      const d = new Date(todayIso + 'T00:00:00.000Z');
      const day = d.getUTCDay();
      const diff = (day === 0 ? -6 : 1) - day;
      d.setUTCDate(d.getUTCDate() + diff);
      return d.toISOString().slice(0, 10);
    };
    const startOfMonth = () => `${todayIso.slice(0, 7)}-01`;

    const weekStart = startOfWeek();
    const monthStart = startOfMonth();

    const sumFor = (t: Target) => {
      let from = t.startDate;
      let to: string | null = t.endDate ?? null;
      if (t.periodType === 'weekly') {
        from = weekStart < t.startDate ? t.startDate : weekStart;
        to = todayIso;
      } else if (t.periodType === 'monthly') {
        from = monthStart < t.startDate ? t.startDate : monthStart;
        to = todayIso;
      } else if (t.periodType === 'trip') {
        const trip = t.tripId ? tripById[t.tripId] : null;
        if (trip) {
          from = trip.startDate < t.startDate ? t.startDate : trip.startDate;
          to = trip.endDate;
        }
      }

      let sum = 0;
      for (const a of activities) {
        if (t.tripId && a.tripId !== t.tripId) continue;
        if (t.categoryId && a.categoryId !== t.categoryId) continue;
        if (a.date < from) continue;
        if (to && a.date > to) continue;
        sum += a.amount;
      }
      return sum;
    };

    const map = new Map<number, { spent: number; remaining: number; exceeded: boolean; pct: number }>();
    for (const t of targets) {
      const spent = sumFor(t);
      const remaining = t.targetAmount - spent;
      const exceeded = remaining < 0;
      const pct = t.targetAmount > 0 ? Math.min(1, spent / t.targetAmount) : 0;
      map.set(t.id, { spent, remaining, exceeded, pct });
    }
    return map;
  }, [targets, activities, tripById]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={['top']}>
      <ScreenHeader title="Targets" subtitle="Weekly/monthly budgets" showBack rightLabel="+ New" onRightPress={resetForm} />

      <View style={{ padding: SPACING.lg, gap: SPACING.md }}>
        <View style={[styles.panel, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Text style={[FONT.h3, { color: palette.text }]}>{editing ? 'Edit target' : 'New target'}</Text>

          <Text style={[FONT.label, { color: palette.textMuted }]}>Period</Text>
          <View style={styles.row}>
            {(['weekly', 'monthly', 'trip'] as PeriodType[]).map((p) => {
              const selected = p === periodType;
              return (
                <Pressable
                  key={p}
                  onPress={() => setPeriodType(p)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  style={[
                    styles.chip,
                    {
                      borderColor: selected ? palette.primary : palette.border,
                      backgroundColor: selected ? palette.primary : 'transparent',
                    },
                  ]}
                >
                  <Text style={{ ...FONT.label, color: selected ? palette.primaryText : palette.text, textTransform: 'capitalize' }}>
                    {p}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[FONT.label, { color: palette.textMuted }]}>Scope</Text>
          <View style={styles.row}>
            {(['global', 'category', 'trip'] as const).map((s) => {
              const selected = s === scope;
              return (
                <Pressable
                  key={s}
                  onPress={() => {
                    setScope(s);
                    if (s !== 'category') setCategoryId(null);
                    if (s !== 'trip') setTripId(null);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  style={[
                    styles.chip,
                    {
                      borderColor: selected ? palette.primary : palette.border,
                      backgroundColor: selected ? palette.primary : 'transparent',
                    },
                  ]}
                >
                  <Text style={{ ...FONT.label, color: selected ? palette.primaryText : palette.text, textTransform: 'capitalize' }}>
                    {s}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {scope === 'category' ? (
            <View style={{ gap: SPACING.sm }}>
              <Text style={[FONT.label, { color: palette.textMuted }]}>Category</Text>
              <View style={styles.wrap}>
                {categories.map((c) => {
                  const selected = c.id === categoryId;
                  return (
                    <Pressable
                      key={c.id}
                      onPress={() => setCategoryId(c.id)}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      style={[
                        styles.scopeChip,
                        { borderColor: selected ? palette.primary : palette.border, backgroundColor: palette.surfaceAlt },
                      ]}
                    >
                      <View style={[styles.dot, { backgroundColor: c.color }]} />
                      <Text style={[FONT.small, { color: palette.text }]} numberOfLines={1}>
                        {c.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}

          {scope === 'trip' ? (
            <View style={{ gap: SPACING.sm }}>
              <Text style={[FONT.label, { color: palette.textMuted }]}>Trip</Text>
              <View style={styles.wrap}>
                {trips.map((t) => {
                  const selected = t.id === tripId;
                  return (
                    <Pressable
                      key={t.id}
                      onPress={() => setTripId(t.id)}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      style={[
                        styles.scopeChip,
                        { borderColor: selected ? palette.primary : palette.border, backgroundColor: palette.surfaceAlt },
                      ]}
                    >
                      <Text style={[FONT.small, { color: palette.text }]} numberOfLines={1}>
                        {t.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}

          <FormField label="Target amount (€)" placeholder="e.g., 250" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} />
          <FormField label="Start date" placeholder="YYYY-MM-DD" value={startDate} onChangeText={setStartDate} />

          <Text style={[FONT.label, { color: palette.textMuted }]}>Active</Text>
          <View style={styles.row}>
            {([true, false] as const).map((v) => {
              const selected = v === active;
              return (
                <Pressable
                  key={String(v)}
                  onPress={() => setActive(v)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  style={[
                    styles.chip,
                    {
                      borderColor: selected ? palette.primary : palette.border,
                      backgroundColor: selected ? palette.primary : 'transparent',
                    },
                  ]}
                >
                  <Text style={{ ...FONT.label, color: selected ? palette.primaryText : palette.text }}>{v ? 'Yes' : 'No'}</Text>
                </Pressable>
              );
            })}
          </View>

          <PrimaryButton label={saving ? 'Saving…' : editing ? 'Save changes' : 'Add target'} onPress={save} disabled={saving} />
          <Text style={[FONT.small, { color: palette.textMuted }]}>Current total spend across all activities: €{totalSpend.toFixed(2)}</Text>
        </View>

        <FlatList
          data={targets}
          keyExtractor={(t) => String(t.id)}
          contentContainerStyle={{ gap: SPACING.sm, paddingBottom: SPACING.xxl }}
          ListEmptyComponent={
            <View style={{ padding: SPACING.xl, alignItems: 'center', gap: SPACING.sm }}>
              <Text style={[FONT.h3, { color: palette.text }]}>No targets yet</Text>
              <Text style={[FONT.body, { color: palette.textMuted, textAlign: 'center' }]}>
                Add a weekly or monthly budget target to track progress.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const label = labelForTarget(item, item.categoryId ? categoryById[item.categoryId]?.name : undefined, item.tripId ? tripById[item.tripId]?.name : undefined);
            const prog = progressByTargetId.get(item.id);
            return (
              <View style={[styles.item, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={[FONT.h3, { color: palette.text }]}>€{item.targetAmount.toFixed(2)}</Text>
                  <Text style={[FONT.small, { color: palette.textMuted }]}>{label}</Text>
                  <Text style={[FONT.small, { color: palette.textMuted }]}>
                    Start: {item.startDate} · {item.active ? 'Active' : 'Inactive'}
                  </Text>
                  {prog ? (
                    <>
                      <View style={[styles.progressTrack, { backgroundColor: palette.surfaceAlt }]}>
                        <View
                          style={[
                            styles.progressFill,
                            { width: `${prog.pct * 100}%`, backgroundColor: prog.exceeded ? palette.danger : palette.accent },
                          ]}
                        />
                      </View>
                      <Text style={[FONT.small, { color: prog.exceeded ? palette.danger : palette.textMuted }]}>
                        Spent €{prog.spent.toFixed(2)} · {prog.exceeded ? `Exceeded by €${Math.abs(prog.remaining).toFixed(2)}` : `Remaining €${prog.remaining.toFixed(2)}`}
                      </Text>
                    </>
                  ) : null}
                </View>
                <View style={{ gap: SPACING.sm, alignItems: 'flex-end' }}>
                  <Pressable onPress={() => beginEdit(item)} accessibilityRole="button">
                    <Text style={[FONT.label, { color: palette.primary }]}>Edit</Text>
                  </Pressable>
                  <Pressable onPress={() => confirmDelete(item.id)} accessibilityRole="button">
                    <Text style={[FONT.label, { color: palette.danger }]}>Delete</Text>
                  </Pressable>
                </View>
              </View>
            );
          }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  panel: { borderWidth: 1, borderRadius: RADIUS.lg, padding: SPACING.lg, gap: SPACING.md },
  row: { flexDirection: 'row', gap: SPACING.sm, flexWrap: 'wrap' },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: SPACING.md, paddingVertical: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  scopeChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  item: { borderWidth: 1, borderRadius: RADIUS.lg, padding: SPACING.lg, flexDirection: 'row', gap: SPACING.md, alignItems: 'center' },
  progressTrack: { height: 8, borderRadius: 4, overflow: 'hidden', marginTop: 6 },
  progressFill: { height: '100%' },
});

