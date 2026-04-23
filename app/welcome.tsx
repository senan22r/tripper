import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '../components/ui/primary-button';
import { FONT, SPACING } from '../constants/theme';
import { useTheme } from '../context/theme-context';

export default function Welcome() {
  const router = useRouter();
  const { palette } = useTheme();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]}>
      <View style={styles.container}>
        <View style={styles.brand}>
          <Text style={[FONT.h1, { color: palette.primary }]}>Tripper</Text>
          <Text style={[FONT.body, { color: palette.textMuted, textAlign: 'center' }]}>
            Plan trips, track spending, stay on budget.
          </Text>
        </View>

        <View style={styles.actions}>
          <PrimaryButton label="Create an account" onPress={() => router.push('/register')} />
          <PrimaryButton label="I already have an account" variant="ghost" onPress={() => router.push('/login')} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, padding: SPACING.xl, justifyContent: 'space-between' },
  brand: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.md },
  actions: { gap: SPACING.md, marginBottom: SPACING.lg },
});
