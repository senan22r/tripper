import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FormField } from '../components/ui/form-field';
import { PrimaryButton } from '../components/ui/primary-button';
import { ScreenHeader } from '../components/ui/screen-header';
import { SPACING } from '../constants/theme';
import { useData } from '../context/data-context';
import { useTheme } from '../context/theme-context';

export default function TripForm() {
  const params = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const { palette } = useTheme();
  const { trips, addTrip, updateTrip, deleteTrip } = useData();
  const editingId = params.id ? Number(params.id) : null;
  const editing = useMemo(() => trips.find((t) => t.id === editingId) ?? null, [trips, editingId]);

  const [name, setName] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [budget, setBudget] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editing) {
      setName(editing.name);
      setDestination(editing.destination);
      setStartDate(editing.startDate);
      setEndDate(editing.endDate);
      setBudget(String(editing.totalBudget));
      setNotes(editing.notes ?? '');
    }
  }, [editing]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Trip name is required.';
    if (!destination.trim()) e.destination = 'Destination is required.';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) e.startDate = 'Use YYYY-MM-DD.';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(endDate)) e.endDate = 'Use YYYY-MM-DD.';
    if (!e.startDate && !e.endDate && endDate < startDate) e.endDate = 'End date must be on or after start date.';
    const budgetNum = Number(budget);
    if (budget.trim() === '' || isNaN(budgetNum) || budgetNum < 0) e.budget = 'Enter a non-negative number.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        destination: destination.trim(),
        startDate,
        endDate,
        totalBudget: Number(budget),
        notes: notes.trim() || null,
      };
      if (editingId) {
        await updateTrip(editingId, payload);
      } else {
        const row = await addTrip(payload);
        router.replace(`/trip/${row.id}`);
        return;
      }
      router.back();
    } catch (e) {
      Alert.alert('Save failed', String(e));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!editingId) return;
    Alert.alert('Delete trip?', 'This will also remove all activities for this trip.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteTrip(editingId);
          router.replace('/(tabs)');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }}>
      <ScreenHeader title={editingId ? 'Edit trip' : 'New trip'} showBack />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          <FormField label="Trip name" value={name} onChangeText={setName} placeholder="Paris weekend" error={errors.name} />
          <FormField label="Destination" value={destination} onChangeText={setDestination} placeholder="Paris, France" error={errors.destination} />
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <FormField label="Start date" value={startDate} onChangeText={setStartDate} placeholder="YYYY-MM-DD" error={errors.startDate} autoCapitalize="none" />
            </View>
            <View style={{ flex: 1 }}>
              <FormField label="End date" value={endDate} onChangeText={setEndDate} placeholder="YYYY-MM-DD" error={errors.endDate} autoCapitalize="none" />
            </View>
          </View>
          <FormField
            label="Total budget"
            value={budget}
            onChangeText={setBudget}
            placeholder="900"
            keyboardType="decimal-pad"
            error={errors.budget}
          />
          <FormField
            label="Notes"
            value={notes}
            onChangeText={setNotes}
            placeholder="Anything worth remembering"
            multiline
            numberOfLines={3}
          />
          <View style={{ marginTop: SPACING.sm, gap: SPACING.md }}>
            <PrimaryButton label={editingId ? 'Save changes' : 'Create trip'} onPress={handleSave} loading={saving} />
            {editingId ? <PrimaryButton label="Delete trip" variant="danger" onPress={handleDelete} /> : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  form: { padding: SPACING.lg },
  row: { flexDirection: 'row', gap: SPACING.md },
});
