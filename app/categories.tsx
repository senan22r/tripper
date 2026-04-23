import { useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FormField } from '../components/ui/form-field';
import { PrimaryButton } from '../components/ui/primary-button';
import { ScreenHeader } from '../components/ui/screen-header';
import { FONT, RADIUS, SPACING } from '../constants/theme';
import { useData } from '../context/data-context';
import { useTheme } from '../context/theme-context';

const PRESET_COLORS = ['#4C6EF5', '#12B886', '#F59F00', '#E8590C', '#AE3EC9', '#15AABF', '#FA5252'];
const PRESET_ICONS = ['bed-outline', 'airplane-outline', 'ticket-outline', 'restaurant-outline', 'wallet-outline', 'map-outline'];

export default function CategoriesScreen() {
  const { palette } = useTheme();
  const { categories, addCategory, updateCategory, deleteCategory, activities } = useData();

  const [editingId, setEditingId] = useState<number | null>(null);
  const editing = useMemo(() => categories.find((c) => c.id === editingId) ?? null, [categories, editingId]);

  const [name, setName] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [icon, setIcon] = useState(PRESET_ICONS[0]);
  const [saving, setSaving] = useState(false);

  const beginNew = () => {
    setEditingId(null);
    setName('');
    setColor(PRESET_COLORS[0]);
    setIcon(PRESET_ICONS[0]);
  };

  const beginEdit = (id: number) => {
    const c = categories.find((x) => x.id === id);
    if (!c) return;
    setEditingId(id);
    setName(c.name);
    setColor(c.color);
    setIcon(c.icon);
  };

  const save = async () => {
    const clean = name.trim();
    if (!clean) return Alert.alert('Missing name', 'Please enter a category name.');
    setSaving(true);
    try {
      if (editing) {
        await updateCategory(editing.id, { name: clean, color, icon });
      } else {
        await addCategory({ name: clean, color, icon });
      }
      beginNew();
    } catch {
      Alert.alert('Save failed', 'Could not save category.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (id: number) => {
    const usage = activities.filter((a) => a.categoryId === id).length;
    if (usage > 0) {
      Alert.alert('Cannot delete', 'This category is used by one or more activities.');
      return;
    }
    Alert.alert('Delete category?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteCategory(id);
            if (editingId === id) beginNew();
          } catch {
            Alert.alert('Delete failed', 'Could not delete category.');
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={['top']}>
      <ScreenHeader title="Categories" subtitle="Name, colour, icon" showBack rightLabel="+ New" onRightPress={beginNew} />

      <View style={{ padding: SPACING.lg, gap: SPACING.md }}>
        <View style={[styles.panel, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Text style={[FONT.h3, { color: palette.text }]}>{editing ? 'Edit category' : 'New category'}</Text>
          <FormField label="Name" placeholder="e.g., Food" value={name} onChangeText={setName} />

          <Text style={[FONT.label, { color: palette.textMuted }]}>Colour</Text>
          <View style={styles.rowWrap}>
            {PRESET_COLORS.map((c) => {
              const active = c === color;
              return (
                <Pressable
                  key={c}
                  onPress={() => setColor(c)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={[
                    styles.colorSwatch,
                    {
                      backgroundColor: c,
                      borderColor: active ? palette.primary : palette.border,
                      borderWidth: active ? 3 : 1,
                    },
                  ]}
                />
              );
            })}
          </View>

          <Text style={[FONT.label, { color: palette.textMuted }]}>Icon (stored label)</Text>
          <View style={styles.rowWrap}>
            {PRESET_ICONS.map((i) => {
              const active = i === icon;
              return (
                <Pressable
                  key={i}
                  onPress={() => setIcon(i)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={[
                    styles.iconChip,
                    { borderColor: active ? palette.primary : palette.border, backgroundColor: palette.surfaceAlt },
                  ]}
                >
                  <Text style={[FONT.small, { color: palette.text }]}>{i}</Text>
                </Pressable>
              );
            })}
          </View>

          <PrimaryButton label={saving ? 'Saving…' : editing ? 'Save changes' : 'Add category'} onPress={save} disabled={saving} />
        </View>

        <FlatList
          data={categories}
          keyExtractor={(c) => String(c.id)}
          contentContainerStyle={{ gap: SPACING.sm, paddingBottom: SPACING.xxl }}
          ListEmptyComponent={
            <View style={{ padding: SPACING.xl, gap: SPACING.sm, alignItems: 'center' }}>
              <Text style={[FONT.h3, { color: palette.text }]}>No categories</Text>
              <Text style={[FONT.body, { color: palette.textMuted, textAlign: 'center' }]}>
                Add a category so every activity can be organised.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.item, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <View style={[styles.dot, { backgroundColor: item.color }]} />
              <View style={{ flex: 1 }}>
                <Text style={[FONT.h3, { color: palette.text }]}>{item.name}</Text>
                <Text style={[FONT.small, { color: palette.textMuted }]}>{item.icon}</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
                <Pressable onPress={() => beginEdit(item.id)} accessibilityRole="button">
                  <Text style={[FONT.label, { color: palette.primary }]}>Edit</Text>
                </Pressable>
                <Pressable onPress={() => confirmDelete(item.id)} accessibilityRole="button">
                  <Text style={[FONT.label, { color: palette.danger }]}>Delete</Text>
                </Pressable>
              </View>
            </View>
          )}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  panel: { borderWidth: 1, borderRadius: RADIUS.lg, padding: SPACING.lg, gap: SPACING.md },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  colorSwatch: { width: 32, height: 32, borderRadius: 16 },
  iconChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: SPACING.md, paddingVertical: 8 },
  item: { borderWidth: 1, borderRadius: RADIUS.lg, padding: SPACING.lg, flexDirection: 'row', gap: SPACING.md, alignItems: 'center' },
  dot: { width: 12, height: 12, borderRadius: 6 },
});

