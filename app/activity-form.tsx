import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FormField } from '../components/ui/form-field';
import { PrimaryButton } from '../components/ui/primary-button';
import { ScreenHeader } from '../components/ui/screen-header';
import { FONT, RADIUS, SPACING } from '../constants/theme';
import { useData } from '../context/data-context';
import { useTheme } from '../context/theme-context';

type Status = 'planned' | 'completed';

export default function ActivityForm() {
  const router = useRouter();
  const { palette } = useTheme();
  const { tripId: tripIdRaw, id: activityIdRaw } = useLocalSearchParams<{ tripId: string; id?: string }>();
  const tripId = Number(tripIdRaw);
  const activityId = activityIdRaw ? Number(activityIdRaw) : null;

  const { trips, activities, categories, addActivity, updateActivity } = useData();
  const trip = trips.find((t) => t.id === tripId) ?? null;
  const existing = activityId ? activities.find((a) => a.id === activityId) ?? null : null;

  const initialDate = useMemo(() => {
    const d = new Date().toISOString().slice(0, 10);
    return d;
  }, []);

  const [title, setTitle] = useState(existing?.title ?? '');
  const [date, setDate] = useState(existing?.date ?? initialDate);
  const [amount, setAmount] = useState(existing ? String(existing.amount) : '');
  const [durationMinutes, setDurationMinutes] = useState(existing?.durationMinutes ? String(existing.durationMinutes) : '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [status, setStatus] = useState<Status>((existing?.status as Status) ?? 'planned');
  const [categoryId, setCategoryId] = useState<number | null>(existing?.categoryId ?? null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (existing) {
      setTitle(existing.title);
      setDate(existing.date);
      setAmount(String(existing.amount));
      setDurationMinutes(existing.durationMinutes ? String(existing.durationMinutes) : '');
      setNotes(existing.notes ?? '');
      setStatus(existing.status as Status);
      setCategoryId(existing.categoryId);
    }
  }, [activityId]);

  const save = async () => {
    const cleanTitle = title.trim();
    if (!trip) return Alert.alert('Trip missing', 'Please go back and select a valid trip.');
    if (!cleanTitle) return Alert.alert('Missing title', 'Please enter an activity title.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) return Alert.alert('Invalid date', 'Use YYYY-MM-DD.');
    if (!categoryId) return Alert.alert('Missing category', 'Please choose a category.');

    const cleanAmount = Number(amount);
    if (!Number.isFinite(cleanAmount) || cleanAmount < 0) return Alert.alert('Invalid amount', 'Enter a valid number.');

    const cleanDuration = durationMinutes.trim() ? Number(durationMinutes) : null;
    if (durationMinutes.trim() && (!Number.isFinite(cleanDuration) || (cleanDuration ?? 0) < 0)) {
      return Alert.alert('Invalid duration', 'Enter minutes as a number, or leave blank.');
    }

    setSaving(true);
    try {
      if (existing) {
        await updateActivity(existing.id, {
          title: cleanTitle,
          date: date.trim(),
          amount: cleanAmount,
          durationMinutes: cleanDuration ? Math.round(cleanDuration) : null,
          notes: notes.trim() ? notes.trim() : null,
          status,
          categoryId,
          tripId: trip.id,
        });
      } else {
        await addActivity({
          tripId: trip.id,
          title: cleanTitle,
          date: date.trim(),
          amount: cleanAmount,
          durationMinutes: cleanDuration ? Math.round(cleanDuration) : null,
          notes: notes.trim() ? notes.trim() : null,
          status,
          categoryId,
        });
      }
      router.back();
    } catch {
      Alert.alert('Save failed', 'Could not save this activity. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={['top']}>
      <ScreenHeader title={existing ? 'Edit activity' : 'New activity'} subtitle={trip?.name ?? 'Trip'} showBack />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: SPACING.lg, paddingBottom: SPACING.xxl, gap: SPACING.md }}>
          <FormField label="Title" placeholder="e.g., Louvre entry" value={title} onChangeText={setTitle} />
          <FormField label="Date" placeholder="YYYY-MM-DD" value={date} onChangeText={setDate} />
          <FormField label="Amount (€)" placeholder="0" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} />
          <FormField
            label="Duration (minutes) (optional)"
            placeholder="e.g., 120"
            keyboardType="number-pad"
            value={durationMinutes}
            onChangeText={setDurationMinutes}
          />
          <FormField label="Notes (optional)" placeholder="Any extra details…" value={notes} onChangeText={setNotes} />

          <View style={{ gap: SPACING.sm }}>
            <Text style={[FONT.label, { color: palette.textMuted }]}>Status</Text>
            <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
              {(['planned', 'completed'] as Status[]).map((s) => {
                const active = s === status;
                return (
                  <Pressable
                    key={s}
                    onPress={() => setStatus(s)}
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
                    <Text style={{ ...FONT.label, color: active ? palette.primaryText : palette.text, textTransform: 'capitalize' }}>
                      {s}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={{ gap: SPACING.sm }}>
            <Text style={[FONT.label, { color: palette.textMuted }]}>Category</Text>
            {categories.length === 0 ? (
              <View style={[styles.infoBox, { borderColor: palette.border, backgroundColor: palette.surface }]}>
                <Text style={[FONT.body, { color: palette.textMuted }]}>
                  No categories yet. Create one in Settings → Categories.
                </Text>
              </View>
            ) : (
              <View style={styles.categoryWrap}>
                {categories.map((c) => {
                  const active = c.id === categoryId;
                  return (
                    <Pressable
                      key={c.id}
                      onPress={() => setCategoryId(c.id)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      style={[
                        styles.categoryChip,
                        {
                          borderColor: active ? palette.primary : palette.border,
                          backgroundColor: palette.surface,
                        },
                      ]}
                    >
                      <View style={[styles.dot, { backgroundColor: c.color }]} />
                      <Text style={[FONT.body, { color: palette.text }]} numberOfLines={1}>
                        {c.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>

          <PrimaryButton label={saving ? 'Saving…' : 'Save'} onPress={save} disabled={saving} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: SPACING.md, paddingVertical: 8 },
  categoryWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  categoryChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    maxWidth: '100%',
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  infoBox: { borderWidth: 1, borderRadius: RADIUS.md, padding: SPACING.md },
});

