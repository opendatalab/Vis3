// 颜色系统
export const colors = {
  // 主色
  primary: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9',
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e',
  },
  // 成功色
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
  },
  // 危险色
  danger: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  },
  // 警告色
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },
  // 中性色
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
  // 文本颜色
  text: {
    primary: '#1f2937', // gray-800
    secondary: '#4b5563', // gray-600
    disabled: '#9ca3af', // gray-400
    inverse: '#ffffff',
  },
  // 背景颜色
  background: {
    default: '#ffffff',
    paper: '#f9fafb', // gray-50
    disabled: '#f3f4f6', // gray-100
  },
  // 边框颜色
  border: {
    default: '#e5e7eb', // gray-200
    focused: '#0ea5e9', // primary-500
  },
  // 状态颜色
  state: {
    hover: 'rgba(0, 0, 0, 0.04)',
    active: 'rgba(0, 0, 0, 0.08)',
    selected: 'rgba(14, 165, 233, 0.12)', // primary-500 at 12% opacity
  }
};

// 尺寸系统
export const spacing = {
  0: '0',
  0.5: '0.125rem', // 2px
  1: '0.25rem',    // 4px
  1.5: '0.375rem', // 6px
  2: '0.5rem',     // 8px
  2.5: '0.625rem', // 10px
  3: '0.75rem',    // 12px
  3.5: '0.875rem', // 14px
  4: '1rem',       // 16px
  5: '1.25rem',    // 20px
  6: '1.5rem',     // 24px
  7: '1.75rem',    // 28px
  8: '2rem',       // 32px
  9: '2.25rem',    // 36px
  10: '2.5rem',    // 40px
  11: '2.75rem',   // 44px
  12: '3rem',      // 48px
  14: '3.5rem',    // 56px
  16: '4rem',      // 64px
  20: '5rem',      // 80px
  24: '6rem',      // 96px
  28: '7rem',      // 112px
  32: '8rem',      // 128px
  36: '9rem',      // 144px
  40: '10rem',     // 160px
  44: '11rem',     // 176px
  48: '12rem',     // 192px
  52: '13rem',     // 208px
  56: '14rem',     // 224px
  60: '15rem',     // 240px
  64: '16rem',     // 256px
  72: '18rem',     // 288px
  80: '20rem',     // 320px
  96: '24rem',     // 384px
};

// 字体系统
export const typography = {
  fontFamily: {
    sans: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  },
  fontSize: {
    xs: '0.75rem',     // 12px
    sm: '0.875rem',    // 14px
    base: '1rem',      // 16px
    lg: '1.125rem',    // 18px
    xl: '1.25rem',     // 20px
    '2xl': '1.5rem',   // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem',  // 36px
    '5xl': '3rem',     // 48px
  },
  fontWeight: {
    thin: '100',
    extralight: '200',
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900',
  },
  lineHeight: {
    none: '1',
    tight: '1.25',
    snug: '1.375',
    normal: '1.5',
    relaxed: '1.625',
    loose: '2',
  },
};

// 圆角系统
export const borderRadius = {
  none: '0',
  sm: '0.125rem',    // 2px
  DEFAULT: '0.25rem', // 4px
  md: '0.375rem',    // 6px
  lg: '0.5rem',      // 8px
  xl: '0.75rem',     // 12px
  '2xl': '1rem',     // 16px
  '3xl': '1.5rem',   // 24px
  full: '9999px',
};

// 阴影系统
export const shadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  DEFAULT: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
};

// 按钮特定的主题变量
export const buttonTokens = {
  // 定义按钮尺寸
  size: {
    sm: {
      padding: `${spacing[1.5]} ${spacing[2.5]}`,
      fontSize: typography.fontSize.sm,
      iconPadding: spacing[1.5],
    },
    md: {
      padding: `${spacing[2]} ${spacing[4]}`,
      fontSize: typography.fontSize.base,
      iconPadding: spacing[2],
    },
    lg: {
      padding: `${spacing[2.5]} ${spacing[6]}`,
      fontSize: typography.fontSize.lg,
      iconPadding: spacing[2.5],
    },
  },
  // 定义不同按钮变体的颜色
  variant: {
    primary: {
      background: colors.primary[600],
      color: colors.text.inverse,
      hoverBackground: colors.primary[500],
      activeBackground: colors.primary[700],
      disabledBackground: colors.primary[300],
      focusRingColor: colors.primary[500],
    },
    secondary: {
      background: colors.gray[200],
      color: colors.gray[800],
      hoverBackground: colors.gray[300],
      activeBackground: colors.gray[400],
      disabledBackground: colors.gray[100],
      disabledColor: colors.gray[400],
      focusRingColor: colors.gray[400],
    },
    outline: {
      background: 'transparent',
      color: colors.gray[700],
      border: `1px solid ${colors.gray[300]}`,
      hoverBackground: colors.gray[50],
      activeBackground: colors.gray[100],
      disabledColor: colors.gray[300],
      focusRingColor: colors.gray[400],
    },
    ghost: {
      background: 'transparent',
      color: colors.gray[700],
      hoverBackground: colors.gray[100],
      activeBackground: colors.gray[200],
      disabledColor: colors.gray[300],
      focusRingColor: colors.gray[400],
    },
    danger: {
      background: colors.danger[600],
      color: colors.text.inverse,
      hoverBackground: colors.danger[500],
      activeBackground: colors.danger[700],
      disabledBackground: colors.danger[300],
      focusRingColor: colors.danger[500],
    },
    link: {
      background: 'transparent',
      color: colors.primary[600],
      hoverColor: colors.primary[700],
      activeColor: colors.primary[800],
      disabledColor: colors.primary[300],
      focusRingColor: colors.primary[400],
      textDecoration: 'underline',
      padding: 0,
    },
  },
};

// 导出所有主题token
export const tokens = {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
  components: {
    button: buttonTokens,
  },
};

export default tokens; 