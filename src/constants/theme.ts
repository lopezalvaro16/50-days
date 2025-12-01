export const PALETTE = {
  // Doodle Theme (Hand-Drawn/Sketchy)
  doodle: {
    background: '#F9F7F2', // Warm paper background
    surface: '#FFFFFF',
    surfaceHighlight: '#F0EFE9',
    text: '#2C3E50', // Ink Blue/Black
    textSecondary: '#7F8C8D',
    border: '#2C3E50', // Dark border for "ink" look
    primary: '#FF6B6B', // Pastel Red/Coral
    secondary: '#4ECDC4', // Pastel Teal
    accent: '#FFE66D', // Pastel Yellow
    success: '#6BCB77',
    error: '#FF6B6B',
    shadow: '#95A5A6',
  },
  // Light Mode (Apple/Win11 Inspired)
  light: {
    background: '#F5F5F7',
    surface: '#FFFFFF',
    surfaceHighlight: '#F0F0F0',
    text: '#1D1D1F',
    textSecondary: '#86868B',
    border: '#E5E5EA',
    primary: '#FF9500',
    success: '#34C759',
    error: '#FF3B30',
  },
  // Dark Mode (Premium Dark)
  dark: {
    background: '#000000',
    surface: '#1C1C1E',
    surfaceHighlight: '#2C2C2E',
    text: '#FFFFFF',
    textSecondary: '#8E8E93',
    border: '#38383A',
    primary: '#FFD60A',
    success: '#30D158',
    error: '#FF453A',
  }
};

export const SPACING = {
  xs: 4,
  s: 8,
  m: 16,
  l: 24,
  xl: 32,
  xxl: 48,
};

export const SIZES = {
  iconSmall: 16,
  iconMedium: 24,
  iconLarge: 32,
  borderRadius: 12, // Slightly less rounded for doodle look, or we can vary it
  borderRadiusLarge: 20,
};

// Default export
export const COLORS = PALETTE.doodle;
