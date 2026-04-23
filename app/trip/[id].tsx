import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '../../components/ui/primary-button';
import { ScreenHeader } from '../../components/ui/screen-header';
import { FONT, RADIUS, SPACING } from '../../constants/theme';
import { useData } from '../../context/data-context';
import { useTheme } from '../../context/theme-context';
import { getTripWeatherToday } from '../../services/stormglass';
import type { Activity } from '../../db/schema';

export default function TripDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tripId = Number(id);
  const router = useRouter();
  const { palette } = useTheme();
  const { trips, activities, categories, updateActivity, deleteActivity } = useData();
  const trip = trips.find((t) => t.id === tripId) ?? null;

  const tripActivities = useMemo(
    () => activities.filter((a) => a.tripId === tripId).sort((a, b) => a.date.localeCompare(b.date)),
    [activities, tripId]
  );

  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<number | 'all'>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const visibleActivities = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tripActivities.filter((a) => {
      if (categoryFilter !== 'all' && a.categoryId !== categoryFilter) return false;
      if (fromDate.trim() && a.date < fromDate.trim()) return false;
      if (toDate.trim() && a.date > toDate.trim()) return false;
      if (!q) return true;
      return (a.title ?? '').toLowerCase().includes(q) || (a.notes ?? '').toLowerCase().includes(q);
    });
  }, [tripActivities, query, categoryFilter, fromDate, toDate]);

  const spent = tripActivities.reduce((sum, a) => sum + a.amount, 0);
  const remaining = (trip?.totalBudget ?? 0) - spent;
  const categoryById = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c])), [categories]);
  const [weather, setWeather] = useState<{ airC: number | null; windMs: number | null; precip: number | null } | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);

  if (!trip) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }}>
        <ScreenHeader title="Trip not found" showBack />
        <View style={{ padding: SPACING.lg }}>
          <Text style={{ color: palette.text }}>This trip no longer exists.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const toggleStatus = (a: Activity) => {
    updateActivity(a.id, { status: a.status === 'planned' ? 'completed' : 'planned' });
  };

  const confirmDeleteActivity = (a: Activity) => {
    Alert.alert('Delete activity?', a.title, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteActivity(a.id) },
    ]);
  };

  useEffect(() => {
    (async () => {
      setWeatherLoading(true);
      setWeatherError(null);
      try {
        const res = await getTripWeatherToday(trip.destination);
        if (!res) {
          setWeather(null);
          setWeatherError('Weather not available.');
        } else {
          setWeather({ airC: res.airTemperatureC, windMs: res.windSpeedMs, precip: res.precipitationMmH });
        }
      } catch {
        setWeather(null);
        setWeatherError('Could not load weather. Check your key and connection.');
      } finally {
        setWeatherLoading(false);
      }
    })();
  }, [trip.destination]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={['top']}>
      <ScreenHeader
        title={trip.name}
        subtitle={trip.destination}
        showBack
        rightLabel="Edit"
        onRightPress={() => router.push(`/trip-form?id=${trip.id}`)}
      />

      <FlatList
        data={visibleActivities}
        keyExtractor={(a) => String(a.id)}
        contentContainerStyle={{ paddingBottom: SPACING.xxl }}
        ListHeaderComponent={
          <View style={{ padding: SPACING.lg, gap: SPACING.md }}>
            <View style={[styles.summary, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <Text style={[FONT.label, { color: palette.textMuted }]}>
                {trip.startDate} → {trip.endDate}
              </Text>
              <View style={styles.summaryRow}>
                <View style={styles.summaryCell}>
                  <Text style={[FONT.small, { color: palette.textMuted }]}>Spent</Text>
                  <Text style={[FONT.h3, { color: palette.text }]}>€{spent.toFixed(2)}</Text>
                </View>
                <View style={styles.summaryCell}>
                  <Text style={[FONT.small, { color: palette.textMuted }]}>Budget</Text>
                  <Text style={[FONT.h3, { color: palette.text }]}>€{trip.totalBudget.toFixed(2)}</Text>
                </View>
                <View style={styles.summaryCell}>
                  <Text style={[FONT.small, { color: palette.textMuted }]}>{remaining >= 0 ? 'Left' : 'Over'}</Text>
                  <Text style={[FONT.h3, { color: remaining >= 0 ? palette.success : palette.danger }]}>
                    €{Math.abs(remaining).toFixed(2)}
                  </Text>
                </View>
              </View>
              {trip.notes ? (
                <Text style={[FONT.body, { color: palette.textMuted }]}>{trip.notes}</Text>
              ) : null}
            </View>

            <View style={styles.actionsRow}>
              <Text style={[FONT.h3, { color: palette.text, flex: 1 }]}>Activities</Text>
              <PrimaryButton
                label="+ Add"
                variant="secondary"
                onPress={() => router.push(`/activity-form?tripId=${trip.id}`)}
              />
            </View>

            <View style={[styles.weatherCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <Text style={[FONT.label, { color: palette.textMuted }]}>Weather today</Text>
              {weatherLoading ? (
                <ActivityIndicator color={palette.primary} />
              ) : weatherError ? (
                <Text style={[FONT.body, { color: palette.textMuted }]}>{weatherError}</Text>
              ) : weather ? (
                <Text style={[FONT.body, { color: palette.text }]}>
                  {weather.airC == null ? '—' : `${Math.round(weather.airC)}°C`} · wind {weather.windMs == null ? '—' : `${weather.windMs.toFixed(1)} m/s`} · rain{' '}
                  {weather.precip == null ? '—' : `${weather.precip.toFixed(1)} mm/h`}
                </Text>
              ) : null}
            </View>

            <View style={{ gap: SPACING.sm }}>
              <TextInput
                placeholder="Search activities (title/notes)"
                placeholderTextColor={palette.textMuted}
                value={query}
                onChangeText={setQuery}
                accessibilityLabel="Search activities"
                style={[
                  styles.search,
                  { borderColor: palette.border, color: palette.text, backgroundColor: palette.surface },
                ]}
              />
              <View style={styles.filterRow}>
                <TextInput
                  placeholder="From YYYY-MM-DD"
                  placeholderTextColor={palette.textMuted}
                  value={fromDate}
                  onChangeText={setFromDate}
                  accessibilityLabel="Filter from date"
                  style={[
                    styles.smallInput,
                    { borderColor: palette.border, color: palette.text, backgroundColor: palette.surface },
                  ]}
                />
                <TextInput
                  placeholder="To YYYY-MM-DD"
                  placeholderTextColor={palette.textMuted}
                  value={toDate}
                  onChangeText={setToDate}
                  accessibilityLabel="Filter to date"
                  style={[
                    styles.smallInput,
                    { borderColor: palette.border, color: palette.text, backgroundColor: palette.surface },
                  ]}
                />
              </View>
              <View style={styles.categoryRow}>
                <Pressable
                  onPress={() => setCategoryFilter('all')}
                  accessibilityRole="button"
                  accessibilityState={{ selected: categoryFilter === 'all' }}
                  style={[
                    styles.catChip,
                    {
                      borderColor: categoryFilter === 'all' ? palette.primary : palette.border,
                      backgroundColor: categoryFilter === 'all' ? palette.primary : 'transparent',
                    },
                  ]}
                >
                  <Text style={{ ...FONT.small, color: categoryFilter === 'all' ? palette.primaryText : palette.text }}>All</Text>
                </Pressable>
                {categories.map((c) => {
                  const active = categoryFilter === c.id;
                  return (
                    <Pressable
                      key={c.id}
                      onPress={() => setCategoryFilter(c.id)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      style={[
                        styles.catChip,
                        { borderColor: active ? palette.primary : palette.border, backgroundColor: active ? palette.primary : 'transparent' },
                      ]}
                    >
                      <View style={[styles.catDot, { backgroundColor: c.color }]} />
                      <Text style={{ ...FONT.small, color: active ? palette.primaryText : palette.text }} numberOfLines={1}>
                        {c.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={{ padding: SPACING.lg }}>
            <Text style={[FONT.body, { color: palette.textMuted, textAlign: 'center' }]}>
              No activities yet. Add your first one above.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const cat = categoryById[item.categoryId];
          return (
            <View style={{ paddingHorizontal: SPACING.lg }}>
              <Pressable
                onPress={() => router.push(`/activity-form?tripId=${trip.id}&id=${item.id}`)}
                onLongPress={() => confirmDeleteActivity(item)}
                accessibilityRole="button"
                accessibilityLabel={`Edit activity ${item.title}`}
                style={({ pressed }) => [
                  styles.activity,
                  {
                    backgroundColor: palette.surface,
                    borderColor: palette.border,
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
              >
                <View style={[styles.catDot, { backgroundColor: cat?.color ?? palette.border }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[FONT.h3, { color: palette.text }]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={[FONT.small, { color: palette.textMuted }]}>
                    {item.date} · {cat?.name ?? 'Uncategorised'} · {item.status}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[FONT.h3, { color: palette.text }]}>€{item.amount.toFixed(2)}</Text>
                  <Pressable
                    onPress={() => toggleStatus(item)}
                    accessibilityRole="button"
                    accessibilityLabel={`Mark ${item.title} as ${item.status === 'planned' ? 'completed' : 'planned'}`}
                  >
                    <Text style={[FONT.small, { color: palette.primary }]}>
                      {item.status === 'planned' ? 'Mark done' : 'Undo'}
                    </Text>
                  </Pressable>
                </View>
              </Pressable>
            </View>
          );
        }}
        ItemSeparatorComponent={() => <View style={{ height: SPACING.sm }} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  summary: { borderWidth: 1, borderRadius: RADIUS.lg, padding: SPACING.lg, gap: SPACING.sm },
  summaryRow: { flexDirection: 'row', gap: SPACING.md },
  summaryCell: { flex: 1 },
  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  weatherCard: { borderWidth: 1, borderRadius: RADIUS.lg, padding: SPACING.lg, gap: SPACING.sm },
  search: { borderWidth: 1, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: 10, ...FONT.body },
  filterRow: { flexDirection: 'row', gap: SPACING.sm },
  smallInput: { flex: 1, borderWidth: 1, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: 10, ...FONT.body },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  catChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: SPACING.md, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 6 },
  activity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  catDot: { width: 12, height: 12, borderRadius: 6 },
});
