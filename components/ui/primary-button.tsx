import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../context/theme-context';
import { FONT, RADIUS, SPACING } from '../../constants/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

export interface PrimaryButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  accessibilityHint?: string;
}

export function PrimaryButton({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  accessibilityHint,
}: PrimaryButtonProps) {
  const { palette } = useTheme();

  const bg =
    variant === 'primary'
      ? palette.primary
      : variant === 'danger'
        ? palette.danger
        : variant === 'secondary'
          ? palette.surfaceAlt
          : 'transparent';

  const fg =
    variant === 'primary' || variant === 'danger'
      ? palette.primaryText
      : palette.text;

  const borderColor =
    variant === 'ghost' ? palette.border : variant === 'secondary' ? palette.border : 'transparent';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: bg,
          borderColor,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={styles.inner}>
        {loading ? <ActivityIndicator color={fg} /> : <Text style={[styles.label, { color: fg }]}>{label}</Text>}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    minHeight: 48,
    justifyContent: 'center',
  },
  inner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm },
  label: { ...FONT.h3 },
});
