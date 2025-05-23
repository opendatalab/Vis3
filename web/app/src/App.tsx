import { createRouter, RouterProvider } from '@tanstack/react-router'
import { ConfigProvider } from 'antd'

import queryClient, { QueryProvider } from './api/queriClient'
import './global.css'
import { routeTree } from './routeTree.gen'

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
  return <QueryProvider><ConfigProvider theme={{
    components: {
      Tree: {
        indentSize: 12,
        directoryNodeSelectedBg: 'rgb(0 0 0 / 9%)',
      },
    },
  }}><RouterProvider router={router} /></ConfigProvider></QueryProvider>
}

export default App
