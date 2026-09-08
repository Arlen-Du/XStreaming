import {StyleSheet, ViewStyle} from 'react-native';

export const tokens = {
  colors: {
    brand: {
      primary: '#107C10',
      neon: '#6EEB83',
      accent: '#86EFAC',
      darkGreen: '#004E00',
    },
    dark: {
      background: '#0E121E',
      surface: 'rgba(18, 22, 34, 0.88)',
      surfaceVariant: 'rgba(30, 36, 52, 0.72)',
      border: 'rgba(255, 255, 255, 0.1)',
      borderGlow: 'rgba(110, 235, 131, 0.28)',
      text: '#F8FAFC',
      textMuted: '#94A3B8',
    },
    light: {
      background: '#FCFBFF',
      surface: 'rgba(255, 255, 255, 0.88)',
      surfaceVariant: 'rgba(241, 245, 249, 0.9)',
      border: 'rgba(226, 232, 240, 0.85)',
      borderGlow: 'rgba(16, 124, 16, 0.25)',
      text: '#0F172A',
      textMuted: '#64748B',
    },
    status: {
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
      info: '#38BDF8',
    },
  },
  radii: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    pill: 9999,
  },
  shadows: {
    card: {
      shadowColor: '#000',
      shadowOffset: {width: 0, height: 8},
      shadowOpacity: 0.14,
      shadowRadius: 20,
      elevation: 4,
    },
    glow: {
      shadowColor: '#107C10',
      shadowOffset: {width: 0, height: 4},
      shadowOpacity: 0.3,
      shadowRadius: 16,
      elevation: 6,
    },
  },
};

export const getGlassCardStyle = (
  isDark: boolean,
  hasGlow = false,
): ViewStyle => {
  if (isDark) {
    return {
      backgroundColor: tokens.colors.dark.surface,
      borderColor: hasGlow
        ? tokens.colors.dark.borderGlow
        : tokens.colors.dark.border,
      borderWidth: 1,
      borderRadius: tokens.radii.xl,
      overflow: 'hidden',
      ...tokens.shadows.card,
      shadowOpacity: 0.35,
    };
  }

  return {
    backgroundColor: tokens.colors.light.surface,
    borderColor: hasGlow
      ? tokens.colors.light.borderGlow
      : tokens.colors.light.border,
    borderWidth: 1,
    borderRadius: tokens.radii.xl,
    overflow: 'hidden',
    ...tokens.shadows.card,
    shadowOpacity: 0.12,
  };
};

export default tokens;
