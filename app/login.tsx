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

export default function Login() {
  const router = useRouter();
  const { login } = useAuth();
  const { palette } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const result = await login(email, password);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.replace('/(tabs)');
    } catch (e) {
      Alert.alert('Login failed', String(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }}>
      <ScreenHeader title="Welcome back" showBack />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
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
            placeholder="Your password"
            secureTextEntry
            error={error ?? undefined}
          />
          <View style={{ marginTop: SPACING.sm, gap: SPACING.md }}>
            <PrimaryButton label="Log in" onPress={handleLogin} loading={submitting} />
            <PrimaryButton
              label="Need an account? Register"
              variant="ghost"
              onPress={() => router.replace('/register')}
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
