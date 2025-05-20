import { createRouter, RouterProvider } from '@tanstack/react-router'

import queryClient, { QueryProvider } from './api/queriClient'
import { routeTree } from './routeTree.gen'
import './global.css'

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
  return <QueryProvider><RouterProvider router={router} /></QueryProvider>
}

export default App
