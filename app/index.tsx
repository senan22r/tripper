import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../context/auth-context';
import { useTheme } from '../context/theme-context';

export default function Index() {
  const { user, loading } = useAuth();
  const { palette } = useTheme();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: palette.background }}>
        <ActivityIndicator color={palette.primary} />
      </View>
    );
  }
  return <Redirect href={user ? '/(tabs)' : '/welcome'} />;
}
