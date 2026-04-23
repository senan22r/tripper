import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '../../components/ui/primary-button';
import { ScreenHeader } from '../../components/ui/screen-header';
import { FONT, RADIUS, SPACING } from '../../constants/theme';
import { useAuth } from '../../context/auth-context';
import { useData } from '../../context/data-context';
import { useTheme } from '../../context/theme-context';
import type { Trip } from '../../db/schema';
import { getTripWeatherToday } from '../../services/stormglass';

type TripFilter = 'all' | 'upcoming' | 'past';

function filterTrips(trips: Trip[], query: string, filter: TripFilter): Trip[] {
  const today = new Date().toISOString().slice(0, 10);
  const q = query.trim().toLowerCase();
  return trips.filter((t) => {
    if (filter === 'upcoming' && t.endDate < today) return false;
    if (filter === 'past' && t.endDate >= today) return false;
    if (!q) return true;
    return (
      t.name.toLowerCase().includes(q) ||
      t.destination.toLowerCase().includes(q) ||
      (t.notes ?? '').toLowerCase().includes(q)
    );
  });
}

export default function TripsHome() {
  const router = useRouter();
  const { user } = useAuth();
  const { trips, activities } = useData();
  const { palette } = useTheme();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<TripFilter>('all');
  const [nextWeather, setNextWeather] = useState<{
    tripId: number;
    destination: string;
    startDate: string;
    airC: number | null;
    windMs: number | null;
    precip: number | null;
  } | null>(null);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [loadingWeather, setLoadingWeather] = useState(false);

  const visible = useMemo(() => filterTrips(trips, query, filter), [trips, query, filter]);

  const nextTrip = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const upcoming = trips.filter((t) => t.startDate >= today).sort((a, b) => a.startDate.localeCompare(b.startDate));
    return upcoming[0] ?? null;
  }, [trips]);

  useEffect(() => {
    (async () => {
      if (!nextTrip) {
        setNextWeather(null);
        setWeatherError(null);
        return;
      }
      setLoadingWeather(true);
      setWeatherError(null);
      try {
        const res = await getTripWeatherToday(nextTrip.destination);
        if (!res) {
          setNextWeather(null);
          setWeatherError('Weather not available.');
        } else {
          setNextWeather({
            tripId: nextTrip.id,
            destination: nextTrip.destination,
            startDate: nextTrip.startDate,
            airC: res.airTemperatureC,
            windMs: res.windSpeedMs,
            precip: res.precipitationMmH,
          });
        }
      } catch {
        setNextWeather(null);
        setWeatherError('Could not load weather. Check your key and connection.');
      } finally {
        setLoadingWeather(false);
      }
    })();
  }, [nextTrip?.id, nextTrip?.destination, nextTrip?.startDate]);

  const spendByTrip = useMemo(() => {
    const map = new Map<number, number>();
    for (const a of activities) {
      map.set(a.tripId, (map.get(a.tripId) ?? 0) + a.amount);
    }
    return map;
  }, [activities]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={['top']}>
      <ScreenHeader
        title={`Hi, ${user?.name ?? ''}`}
        subtitle="Your trips"
        rightLabel="+ New"
        onRightPress={() => router.push('/trip-form')}
      />

      <View style={styles.controls}>
        <TextInput
          placeholder="Search trips by name, destination, notes"
          placeholderTextColor={palette.textMuted}
          value={query}
          onChangeText={setQuery}
          accessibilityLabel="Search trips"
          style={[
            styles.search,
            { borderColor: palette.border, color: palette.text, backgroundColor: palette.surface },
          ]}
        />
        <View style={styles.filters}>
          {(['all', 'upcoming', 'past'] as TripFilter[]).map((f) => {
            const active = f === filter;
            return (
              <Pressable
                key={f}
                onPress={() => setFilter(f)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={[
                  styles.chip,
                  {
                    borderColor: active ? palette.primary : palette.border,
                    backgroundColor: active ? palette.primary : 'transparent',
                  },
                ]}
              >
                <Text
                  style={{
                    ...FONT.label,
                    color: active ? palette.primaryText : palette.text,
                    textTransform: 'capitalize',
                  }}
                >
                  {f}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {nextTrip ? (
        <View style={{ paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm }}>
          <Pressable
            onPress={() => router.push(`/trip/${nextTrip.id}`)}
            accessibilityRole="button"
            accessibilityLabel="Open next trip weather"
            style={[styles.weatherCard, { backgroundColor: palette.surface, borderColor: palette.border }]}
          >
            <Text style={[FONT.label, { color: palette.textMuted }]}>Next trip weather (today)</Text>
            <Text style={[FONT.h3, { color: palette.text }]} numberOfLines={1}>
              {nextTrip.name}
            </Text>
            <Text style={[FONT.body, { color: palette.textMuted }]} numberOfLines={1}>
              {nextTrip.destination} · {nextTrip.startDate}
            </Text>
            {loadingWeather ? (
              <Text style={[FONT.small, { color: palette.textMuted }]}>Loading…</Text>
            ) : weatherError ? (
              <Text style={[FONT.small, { color: palette.textMuted }]}>{weatherError}</Text>
            ) : nextWeather ? (
              <Text style={[FONT.body, { color: palette.text }]}>
                {nextWeather.airC == null ? '—' : `${Math.round(nextWeather.airC)}°C`} · wind{' '}
                {nextWeather.windMs == null ? '—' : `${nextWeather.windMs.toFixed(1)} m/s`} · rain{' '}
                {nextWeather.precip == null ? '—' : `${nextWeather.precip.toFixed(1)} mm/h`}
              </Text>
            ) : null}
          </Pressable>
        </View>
      ) : null}

      <FlatList
        data={visible}
        keyExtractor={(t) => String(t.id)}
        contentContainerStyle={{ padding: SPACING.lg, gap: SPACING.md, paddingBottom: SPACING.xxl }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[FONT.h3, { color: palette.text }]}>No trips yet</Text>
            <Text style={[FONT.body, { color: palette.textMuted, textAlign: 'center' }]}>
              Plan your first trip and start tracking spending.
            </Text>
            <PrimaryButton label="Plan a trip" onPress={() => router.push('/trip-form')} />
          </View>
        }
        renderItem={({ item }) => {
          const spent = spendByTrip.get(item.id) ?? 0;
          const pct = item.totalBudget > 0 ? Math.min(1, spent / item.totalBudget) : 0;
          return (
            <Pressable
              onPress={() => router.push(`/trip/${item.id}`)}
              accessibilityRole="button"
              accessibilityLabel={`Open trip ${item.name}`}
              style={({ pressed }) => [
                styles.card,
                {
                  backgroundColor: palette.surface,
                  borderColor: palette.border,
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              <Text style={[FONT.h3, { color: palette.text }]} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={[FONT.body, { color: palette.textMuted }]} numberOfLines={1}>
                {item.destination} · {item.startDate} → {item.endDate}
              </Text>
              <View style={{ marginTop: SPACING.sm }}>
                <View style={[styles.progressTrack, { backgroundColor: palette.surfaceAlt }]}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${pct * 100}%`,
                        backgroundColor: pct >= 1 ? palette.danger : palette.accent,
                      },
                    ]}
                  />
                </View>
                <Text style={[FONT.small, { color: palette.textMuted, marginTop: 4 }]}>
                  €{spent.toFixed(2)} of €{item.totalBudget.toFixed(2)}
                </Text>
              </View>
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  controls: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm, gap: SPACING.sm },
  search: { borderWidth: 1, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: 10, ...FONT.body },
  filters: { flexDirection: 'row', gap: SPACING.sm },
  weatherCard: { borderWidth: 1, borderRadius: RADIUS.lg, padding: SPACING.lg, gap: 6 },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
  },
  card: { borderWidth: 1, borderRadius: RADIUS.lg, padding: SPACING.lg, gap: SPACING.xs },
  empty: { alignItems: 'center', padding: SPACING.xxl, gap: SPACING.md },
  progressTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%' },
});
