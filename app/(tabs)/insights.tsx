import { useMemo, useState } from 'react';
import { Dimensions, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BarChart, PieChart } from 'react-native-chart-kit';
import { ScreenHeader } from '../../components/ui/screen-header';
import { FONT, RADIUS, SPACING } from '../../constants/theme';
import { useData } from '../../context/data-context';
import { useTheme } from '../../context/theme-context';

type View = 'daily' | 'weekly' | 'monthly';

function startOfISOWeek(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function addDaysUTC(d: Date, days: number): Date {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + days);
  return x;
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function clampText(s: string, n: number) {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

export default function InsightsTab() {
  const { palette } = useTheme();
  const { activities, categories, targets } = useData();
  const [view, setView] = useState<View>('daily');

  const filteredActivities = activities;

  const totalSpent = useMemo(() => filteredActivities.reduce((s, a) => s + a.amount, 0), [filteredActivities]);

  const spendByCategory = useMemo(() => {
    const map = new Map<number, number>();
    for (const a of filteredActivities) {
      map.set(a.categoryId, (map.get(a.categoryId) ?? 0) + a.amount);
    }
    return map;
  }, [filteredActivities]);

  const catById = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c])), [categories]);

  const pieData = useMemo(() => {
    const entries = Array.from(spendByCategory.entries())
      .map(([categoryId, value]) => ({
        categoryId,
        value,
        name: catById[categoryId]?.name ?? 'Unknown',
        color: catById[categoryId]?.color ?? palette.border,
      }))
      .filter((x) => x.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
    return entries.map((e) => ({
      name: clampText(e.name, 10),
      population: e.value,
      color: e.color,
      legendFontColor: palette.textMuted,
      legendFontSize: 12,
    }));
  }, [spendByCategory, catById, palette.border, palette.textMuted]);

  const bar = useMemo(() => {
    const byKey = new Map<string, number>();

    const keyFor = (iso: string) => {
      if (view === 'daily') return iso;
      if (view === 'monthly') return iso.slice(0, 7);
      const d = new Date(`${iso}T00:00:00.000Z`);
      const day = d.getUTCDay();
      const diff = (day === 0 ? -6 : 1) - day;
      d.setUTCDate(d.getUTCDate() + diff);
      return d.toISOString().slice(0, 10);
    };

    for (const a of filteredActivities) {
      const k = keyFor(a.date);
      byKey.set(k, (byKey.get(k) ?? 0) + a.amount);
    }

    const keys = Array.from(byKey.keys()).sort((a, b) => a.localeCompare(b)).slice(-10);
    const labels = keys.map((k) => (view === 'daily' ? k.slice(5) : view === 'weekly' ? `Wk ${k.slice(5)}` : k));
    const values = keys.map((k) => Number((byKey.get(k) ?? 0).toFixed(2)));
    return { labels, values };
  }, [filteredActivities, view]);

  const weeklyTargetStreak = useMemo(() => {
    const weekly = targets.filter((t) => t.active && t.periodType === 'weekly');
    if (weekly.length === 0) return null;

    const today = new Date();
    const thisWeekStart = startOfISOWeek(today);
    const weekStarts: string[] = [];
    for (let i = 0; i < 12; i++) weekStarts.push(isoDate(addDaysUTC(thisWeekStart, -7 * i)));

    let best = 0;

    for (const t of weekly) {
      const start = t.startDate;
      const spendForWeek = (weekStartIso: string) => {
        const weekStart = new Date(`${weekStartIso}T00:00:00.000Z`);
        const weekEnd = addDaysUTC(weekStart, 7);
        let sum = 0;
        for (const a of activities) {
          if (a.date < weekStartIso) continue;
          if (a.date >= isoDate(weekEnd)) continue;
          if (t.categoryId && a.categoryId !== t.categoryId) continue;
          if (t.tripId && a.tripId !== t.tripId) continue;
          sum += a.amount;
        }
        return sum;
      };

      let streak = 0;
      for (const ws of weekStarts) {
        if (ws < start) break;
        const spent = spendForWeek(ws);
        const met = spent <= t.targetAmount;
        if (!met) break;
        streak += 1;
      }
      best = Math.max(best, streak);
    }

    return best;
  }, [targets, activities]);

  const width = Math.min(Dimensions.get('window').width - SPACING.lg * 2, 520);

  const chartConfig = useMemo(
    () => ({
      backgroundColor: palette.surface,
      backgroundGradientFrom: palette.surface,
      backgroundGradientTo: palette.surface,
      color: () => palette.primary,
      labelColor: () => palette.textMuted,
      decimalPlaces: 0,
      propsForBackgroundLines: { stroke: palette.border },
    }),
    [palette]
  );

  const cards = [
    { title: 'Total spent', value: `€${totalSpent.toFixed(2)}` },
    { title: 'Records', value: String(filteredActivities.length) },
    { title: 'Weekly target streak', value: weeklyTargetStreak == null ? '—' : `${weeklyTargetStreak} wk` },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={['top']}>
      <ScreenHeader title="Insights" subtitle="Charts from stored data" />

      <View style={{ paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm, gap: SPACING.sm }}>
        <View style={styles.rangeRow}>
          {(['daily', 'weekly', 'monthly'] as View[]).map((v) => {
            const active = v === view;
            return (
              <Pressable
                key={v}
                onPress={() => setView(v)}
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
                <Text style={{ ...FONT.label, color: active ? palette.primaryText : palette.text, textTransform: 'uppercase' }}>
                  {v}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <FlatList
        data={[{ key: 'content' }]}
        keyExtractor={(x) => x.key}
        contentContainerStyle={{ padding: SPACING.lg, gap: SPACING.md, paddingBottom: SPACING.xxl }}
        renderItem={() => (
          <>
            <View style={styles.cardRow}>
              {cards.map((c) => (
                <View key={c.title} style={[styles.statCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                  <Text style={[FONT.small, { color: palette.textMuted }]}>{c.title}</Text>
                  <Text style={[FONT.h2, { color: palette.text }]}>{c.value}</Text>
                </View>
              ))}
            </View>
            <Text style={[FONT.small, { color: palette.textMuted }]}>
              Streak = consecutive weeks (ending this week) where your spending stayed within the weekly target(s).
            </Text>

            <View style={[styles.panel, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <Text style={[FONT.h3, { color: palette.text }]}>
                Spend by {view === 'daily' ? 'day' : view === 'weekly' ? 'week' : 'month'}
              </Text>
              {filteredActivities.length === 0 ? (
                <Text style={[FONT.body, { color: palette.textMuted }]}>No data in this range yet.</Text>
              ) : (
                <BarChart
                  data={{ labels: bar.labels, datasets: [{ data: bar.values }] }}
                  width={width}
                  height={220}
                  yAxisLabel="€"
                  fromZero
                  chartConfig={chartConfig}
                  style={{ borderRadius: RADIUS.md }}
                />
              )}
            </View>

            <View style={[styles.panel, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <Text style={[FONT.h3, { color: palette.text }]}>Spend by category</Text>
              {pieData.length === 0 ? (
                <Text style={[FONT.body, { color: palette.textMuted }]}>
                  Add activities with categories to see a breakdown.
                </Text>
              ) : (
                <PieChart
                  data={pieData}
                  width={width}
                  height={220}
                  chartConfig={chartConfig}
                  accessor="population"
                  backgroundColor="transparent"
                  paddingLeft="12"
                />
              )}
              <Text style={[FONT.small, { color: palette.textMuted }]}>
                Tip: create weekly targets in Targets to unlock streak tracking.
              </Text>
            </View>

            <View style={[styles.panel, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <Text style={[FONT.h3, { color: palette.text }]}>Quick actions</Text>
              <Text style={[FONT.small, { color: palette.textMuted }]}>
                Targets and Categories are available from the Settings tab.
              </Text>
            </View>
          </>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  rangeRow: { flexDirection: 'row', gap: SPACING.sm },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: SPACING.md, paddingVertical: 6 },
  cardRow: { flexDirection: 'row', gap: SPACING.sm },
  statCard: { flex: 1, borderWidth: 1, borderRadius: RADIUS.lg, padding: SPACING.md, gap: 6 },
  panel: { borderWidth: 1, borderRadius: RADIUS.lg, padding: SPACING.lg, gap: SPACING.sm, alignItems: 'center' },
});

