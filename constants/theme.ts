export type ThemeMode = 'light' | 'dark';

export interface ThemePalette {
  mode: ThemeMode;
  background: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textMuted: string;
  primary: string;
  primaryText: string;
  accent: string;
  danger: string;
  success: string;
  warning: string;
  overlay: string;
}

const lightPalette: ThemePalette = {
  mode: 'light',
  background: '#F6F8F7',
  surface: '#FFFFFF',
  surfaceAlt: '#F0F4F2',
  border: '#E4ECE8',
  text: '#0F1A14',
  textMuted: '#5C6B63',
  primary: '#16A34A',
  primaryText: '#FFFFFF',
  accent: '#22C55E',
  danger: '#DC2626',
  success: '#16A34A',
  warning: '#F59E0B',
  overlay: 'rgba(15,26,20,0.45)',
};

const darkPalette: ThemePalette = {
  mode: 'dark',
  background: '#0B1210',
  surface: '#0F1A14',
  surfaceAlt: '#12251C',
  border: '#1D3A2C',
  text: '#EAF3EE',
  textMuted: '#A7B8AF',
  primary: '#22C55E',
  primaryText: '#07100C',
  accent: '#16A34A',
  danger: '#F87171',
  success: '#22C55E',
  warning: '#FBBF24',
  overlay: 'rgba(0,0,0,0.6)',
};

export const PALETTES: Record<ThemeMode, ThemePalette> = {
  light: lightPalette,
  dark: darkPalette,
};

export const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const RADIUS = { sm: 6, md: 10, lg: 14 };
export const FONT = {
  h1: { fontSize: 28, fontWeight: '700' as const },
  h2: { fontSize: 22, fontWeight: '700' as const },
  h3: { fontSize: 18, fontWeight: '600' as const },
  body: { fontSize: 15, fontWeight: '400' as const },
  label: { fontSize: 13, fontWeight: '600' as const },
  small: { fontSize: 12, fontWeight: '400' as const },
};
