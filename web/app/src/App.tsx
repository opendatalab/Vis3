import './global.css';

import { RouterProvider, createRouter } from '@tanstack/react-router';

import queryClient, { QueryProvider } from './api/queriClient';
import { routeTree } from './routeTree.gen';

const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  scrollRestoration: true,
  context: {
    queryClient: queryClient,
  },
})

// Register things for typesafety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
const App = () => {
  return <QueryProvider><RouterProvider router={router} /></QueryProvider>
}

export default App;
