import { Redirect, Tabs } from 'expo-router';
import { Text } from 'react-native';
import { useAuth } from '../../context/auth-context';
import { useTheme } from '../../context/theme-context';

const ICONS: Record<string, string> = {
  index: '\u2708',
  insights: '\u25B2',
  settings: '\u2699',
};

export default function TabsLayout() {
  const { user, loading } = useAuth();
  const { palette } = useTheme();

  if (loading) return null;
  if (!user) return <Redirect href="/welcome" />;

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: palette.primary,
        tabBarInactiveTintColor: palette.textMuted,
        tabBarStyle: {
          backgroundColor: palette.surface,
          borderTopColor: palette.border,
          height: 60,
          paddingBottom: 6,
          paddingTop: 6,
        },
        tabBarIcon: ({ color, size }) => (
          <Text style={{ color, fontSize: size ?? 20 }}>{ICONS[route.name] ?? '\u25CF'}</Text>
        ),
      })}
    >
      <Tabs.Screen name="index" options={{ title: 'Trips' }} />
      <Tabs.Screen name="insights" options={{ title: 'Insights' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
