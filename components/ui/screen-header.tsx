import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/theme-context';
import { FONT, SPACING } from '../../constants/theme';

export interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  rightLabel?: string;
  onRightPress?: () => void;
}

export function ScreenHeader({ title, subtitle, showBack, rightLabel, onRightPress }: ScreenHeaderProps) {
  const { palette } = useTheme();
  const router = useRouter();

  return (
    <View style={[styles.wrapper, { borderBottomColor: palette.border, backgroundColor: palette.background }]}>
      <View style={styles.row}>
        {showBack ? (
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={styles.side}
          >
            <Text style={[FONT.h3, { color: palette.primary }]}>‹ Back</Text>
          </Pressable>
        ) : (
          <View style={styles.side} />
        )}
        <View style={styles.titleBlock}>
          <Text style={[FONT.h2, { color: palette.text }]} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={[FONT.small, { color: palette.textMuted }]} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {rightLabel && onRightPress ? (
          <Pressable onPress={onRightPress} accessibilityRole="button" style={styles.side}>
            <Text style={[FONT.label, { color: palette.primary, textAlign: 'right' }]}>{rightLabel}</Text>
          </Pressable>
        ) : (
          <View style={styles.side} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  titleBlock: { flex: 1, alignItems: 'center' },
  side: { minWidth: 60 },
});
