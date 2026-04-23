import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Alert, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '../../components/ui/primary-button';
import { ScreenHeader } from '../../components/ui/screen-header';
import { FONT, RADIUS, SPACING } from '../../constants/theme';
import { useAuth } from '../../context/auth-context';
import { useData } from '../../context/data-context';
import { useTheme } from '../../context/theme-context';

export default function SettingsTab() {
  const router = useRouter();
  const { palette, mode, toggle } = useTheme();
  const { logout, deleteAccount, user } = useAuth();
  const { trips, categories, activities } = useData();

  const counts = useMemo(
    () => ({ trips: trips.length, categories: categories.length, activities: activities.length }),
    [trips.length, categories.length, activities.length]
  );

  const confirmDelete = () => {
    Alert.alert('Delete profile?', 'This deletes your local account and all data for it.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteAccount();
          } catch {
            Alert.alert('Delete failed', 'Could not delete your profile.');
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={['top']}>
      <ScreenHeader title="Settings" subtitle="Theme and data" />

      <View style={{ padding: SPACING.lg, gap: SPACING.md }}>
        <View style={[styles.panel, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Text style={[FONT.h3, { color: palette.text }]}>Appearance</Text>
          <View style={styles.rowBetween}>
            <Text style={[FONT.body, { color: palette.textMuted }]}>Theme</Text>
            <View style={styles.rowRight}>
              <Text style={[FONT.small, { color: palette.textMuted }]}>{mode === 'dark' ? 'Dark' : 'Light'}</Text>
              <Switch
                value={mode === 'dark'}
                onValueChange={toggle}
                accessibilityLabel="Toggle dark mode"
                trackColor={{ false: palette.border, true: palette.primary }}
                thumbColor={palette.primaryText}
              />
            </View>
          </View>
        </View>

        <View style={[styles.panel, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Text style={[FONT.h3, { color: palette.text }]}>Data</Text>
          <Text style={[FONT.small, { color: palette.textMuted }]}>
            Trips: {counts.trips} · Categories: {counts.categories} · Activities: {counts.activities}
          </Text>
          <PrimaryButton label="Manage categories" variant="secondary" onPress={() => router.push('/categories')} />
          <PrimaryButton label="Manage targets" variant="secondary" onPress={() => router.push('/targets')} />
        </View>

        <View style={[styles.panel, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Text style={[FONT.h3, { color: palette.text }]}>Profile</Text>
          <Text style={[FONT.small, { color: palette.textMuted }]}>Signed in as {user?.email ?? '—'}</Text>
          <PrimaryButton label="Logout" variant="secondary" onPress={logout} />
          <PrimaryButton label="Delete profile" variant="danger" onPress={confirmDelete} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  panel: { borderWidth: 1, borderRadius: RADIUS.lg, padding: SPACING.lg, gap: SPACING.sm },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.md },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
});

