import { ThemeProvider as EmotionThemeProvider } from '@emotion/react';
import React, { createContext, useContext, useMemo } from 'react';
import tokens from './tokens';

// 主题上下文类型
export interface ThemeContextType {
  tokens: typeof tokens;
  // 未来可以在这里添加更多的主题相关功能
  // 例如：切换暗/亮模式等
}

// 创建主题上下文
export const ThemeContext = createContext<ThemeContextType>({
  tokens,
});

// 主题提供者属性
export interface ThemeProviderProps {
  children: React.ReactNode;
  // 未来可以添加自定义主题，覆盖默认tokens
  // customTokens?: DeepPartial<typeof tokens>;
}

// 主题提供者组件
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // 主题上下文值
  const themeContextValue = useMemo(
    () => ({
      tokens,
    }),
    []
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