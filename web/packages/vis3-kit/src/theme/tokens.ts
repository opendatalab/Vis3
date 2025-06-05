// 颜色系统
export const colors = {
  // 主色 - 蓝色基调 H:200
  primary: {
    50: 'hsl(200, 100%, 97%)',
    100: 'hsl(200, 94%, 94%)',
    200: 'hsl(200, 94%, 86%)',
    300: 'hsl(200, 94%, 74%)',
    400: 'hsl(200, 94%, 60%)',
    500: 'hsl(200, 94%, 48%)',
    600: 'hsl(200, 94%, 39%)',
    700: 'hsl(200, 94%, 32%)',
    800: 'hsl(200, 94%, 26%)',
    900: 'hsl(200, 94%, 20%)',
  },
  // 成功色 - 绿色基调 H:142
  success: {
    50: 'hsl(142, 76%, 97%)',
    100: 'hsl(142, 76%, 93%)',
    200: 'hsl(142, 76%, 85%)',
    300: 'hsl(142, 76%, 73%)',
    400: 'hsl(142, 76%, 59%)',
    500: 'hsl(142, 76%, 45%)',
    600: 'hsl(142, 76%, 36%)',
    700: 'hsl(142, 76%, 29%)',
    800: 'hsl(142, 76%, 24%)',
    900: 'hsl(142, 76%, 19%)',
  },
  // 危险色 - 红色基调 H:0
  danger: {
    50: 'hsl(0, 86%, 97%)',
    100: 'hsl(0, 86%, 93%)',
    200: 'hsl(0, 86%, 85%)',
    300: 'hsl(0, 86%, 73%)',
    400: 'hsl(0, 86%, 59%)',
    500: 'hsl(0, 86%, 45%)',
    600: 'hsl(0, 86%, 36%)',
    700: 'hsl(0, 86%, 29%)',
    800: 'hsl(0, 86%, 24%)',
    900: 'hsl(0, 86%, 19%)',
  },
  // 警告色 - 橙色基调 H:38
  warning: {
    50: 'hsl(38, 92%, 95%)',
    100: 'hsl(38, 92%, 88%)',
    200: 'hsl(38, 92%, 76%)',
    300: 'hsl(38, 92%, 62%)',
    400: 'hsl(38, 92%, 48%)',
    500: 'hsl(38, 92%, 38%)',
    600: 'hsl(38, 92%, 31%)',
    700: 'hsl(38, 92%, 25%)',
    800: 'hsl(38, 92%, 20%)',
    900: 'hsl(38, 92%, 16%)',
  },
  // 中性色 - 灰色基调 H:220
  gray: {
    50: 'hsl(220, 14%, 98%)',
    100: 'hsl(220, 14%, 95%)',
    200: 'hsl(220, 14%, 91%)',
    300: 'hsl(220, 14%, 83%)',
    400: 'hsl(220, 14%, 65%)',
    500: 'hsl(220, 14%, 46%)',
    600: 'hsl(220, 14%, 34%)',
    700: 'hsl(220, 14%, 26%)',
    800: 'hsl(220, 14%, 17%)',
    900: 'hsl(220, 14%, 9%)',
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