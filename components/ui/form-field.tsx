import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { useTheme } from '../../context/theme-context';
import { FONT, RADIUS, SPACING } from '../../constants/theme';

export interface FormFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  error?: string;
  helperText?: string;
}

export function FormField({ label, error, helperText, ...textInputProps }: FormFieldProps) {
  const { palette } = useTheme();

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.label, { color: palette.text }]} accessibilityRole="text">
        {label}
      </Text>
      <TextInput
        {...textInputProps}
        accessibilityLabel={label}
        placeholderTextColor={palette.textMuted}
        style={[
          styles.input,
          {
            color: palette.text,
            backgroundColor: palette.surface,
            borderColor: error ? palette.danger : palette.border,
          },
        ]}
      />
      {error ? (
        <Text style={[styles.helper, { color: palette.danger }]}>{error}</Text>
      ) : helperText ? (
        <Text style={[styles.helper, { color: palette.textMuted }]}>{helperText}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: SPACING.md, gap: SPACING.xs },
  label: { ...FONT.label },
  input: {
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    minHeight: 48,
    ...FONT.body,
  },
  helper: { ...FONT.small },
});
