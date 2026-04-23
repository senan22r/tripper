import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FormField } from '../components/ui/form-field';
import { PrimaryButton } from '../components/ui/primary-button';
import { ScreenHeader } from '../components/ui/screen-header';
import { SPACING } from '../constants/theme';
import { useAuth } from '../context/auth-context';
import { useTheme } from '../context/theme-context';

export default function Register() {
  const router = useRouter();
  const { register } = useAuth();
  const { palette } = useTheme();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const result = await register(name, email, password);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.replace('/(tabs)');
    } catch (e) {
      Alert.alert('Registration failed', String(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }}>
      <ScreenHeader title="Create account" showBack />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          <FormField label="Name" value={name} onChangeText={setName} placeholder="Your name" />
          <FormField
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
          />
          <FormField
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="At least 6 characters"
            secureTextEntry
            error={error ?? undefined}
            helperText="Stored securely on this device only."
          />
          <View style={{ marginTop: SPACING.sm, gap: SPACING.md }}>
            <PrimaryButton label="Create account" onPress={handleRegister} loading={submitting} />
            <PrimaryButton
              label="Already have an account? Log in"
              variant="ghost"
              onPress={() => router.replace('/login')}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  form: { padding: SPACING.lg, gap: SPACING.sm },
});
