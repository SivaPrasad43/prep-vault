export interface ThemeColors {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  success: string;
  successLight: string;
  warning: string;
  warningLight: string;
  danger: string;
  dangerLight: string;
  info: string;
  infoLight: string;
  background: string;
  surface: string;
  surfaceHover: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  borderLight: string;
  overlay: string;
  shadow: string;
  shadowMd: string;
  categoryLanguages: string;
  categoryCoding: string;
  categorySystemDesign: string;
  categoryInterview: string;
  categoryCompany: string;
  categoryResources: string;
  categoryMisc: string;
  confidenceNeedPractice: string;
  confidenceGettingThere: string;
  confidenceConfident: string;
  starActive: string;
  starInactive: string;
}

export interface ThemeSpacing {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  xxl: string;
}

export interface ThemeBorderRadius {
  sm: string;
  md: string;
  lg: string;
  xl: string;
  full: string;
}

export interface ThemeFontSize {
  xs: string;
  sm: string;
  base: string;
  lg: string;
  xl: string;
  xxl: string;
  xxxl: string;
}

export interface ThemeFontWeight {
  normal: number;
  medium: number;
  semibold: number;
  bold: number;
}

export interface ThemeShadow {
  sm: string;
  md: string;
  lg: string;
}

export interface ThemeTransition {
  fast: string;
  normal: string;
  slow: string;
}

export interface Theme {
  colors: ThemeColors;
  spacing: ThemeSpacing;
  borderRadius: ThemeBorderRadius;
  fontSize: ThemeFontSize;
  fontWeight: ThemeFontWeight;
  shadow: ThemeShadow;
  breakpoints: {
    mobile: string;
    tablet: string;
    desktop: string;
    wide: string;
  };
  transition: ThemeTransition;
}
