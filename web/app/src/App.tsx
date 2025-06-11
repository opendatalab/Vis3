import { createRouter, RouterProvider } from '@tanstack/react-router';
import { I18nProvider, useTranslation } from '@vis3/kit';
import { ConfigProvider } from 'antd';
import enUS from 'antd/es/locale/en_US';
import zhCN from 'antd/es/locale/zh_CN';
import { useMemo } from 'react';

import queryClient, { QueryProvider } from './api/queriClient';
import CustomEmpty from './components/CustomEmpty';
import './global.css';
import { routeTree } from './routeTree.gen';
import themeToken from './theme.json';

const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  scrollRestoration: true,
  context: {
    queryClient,
  },
})

// Register things for typesafety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
function App() {
  const { i18n } = useTranslation();
  const locale = useMemo(() => {
    if (['zh', 'zh_CN', 'zh-CN', 'zh-TW', 'zh-HK'].includes(i18n.language)) {
      return 'zh-CN';
    }

    return 'en-US';
  }, [i18n.language]);

  const getAntdLocale = () => {
    if (locale === 'zh-CN') {
      return zhCN;
    } else {
      return enUS;
    }
  };

  return (
    <I18nProvider>
      <QueryProvider>
        <ConfigProvider
          locale={getAntdLocale()}
          theme={themeToken}
          renderEmpty={() => <CustomEmpty />}
        >
          <RouterProvider router={router} />
        </ConfigProvider>
      </QueryProvider>
    </I18nProvider>
  )
}

export default App
