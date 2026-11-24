import { ThemeProvider as EmotionThemeProvider } from '@emotion/react';
import React, { createContext, useContext, useMemo } from 'react';
import tokens from './tokens';

export type ThemeMode = 'light' | 'dark';

// 主题上下文类型
export interface ThemeContextType {
  tokens: typeof tokens;
  mode: ThemeMode;
}

// 创建主题上下文
export const ThemeContext = createContext<ThemeContextType>({
  tokens,
  mode: 'light',
});

// 主题提供者属性
export interface ThemeProviderProps {
  children: React.ReactNode;
  mode?: ThemeMode;
  // 未来可以添加自定义主题，覆盖默认tokens
  // customTokens?: DeepPartial<typeof tokens>;
}

// 主题提供者组件
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children, mode = 'light' }) => {
  // 主题上下文值
  const themeContextValue = useMemo(
    () => ({
      tokens,
      mode,
    }),
    [mode]
  );

  return (
    <ThemeContext.Provider value={themeContextValue}>
      <EmotionThemeProvider theme={themeContextValue.tokens}>
        {children}
      </EmotionThemeProvider>
    </ThemeContext.Provider>
  );
};

// 使用主题的Hook
export const useTheme = () => useContext(ThemeContext);

export default ThemeProvider; 