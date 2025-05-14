import { createRootRoute, Outlet, useLocation } from '@tanstack/react-router'

import { QueryProvider } from '../api/queriClient'
import Header from '../components/Header'

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  // login 和 register 路由不需要头部
  const { pathname } = useLocation()
  const isLoginOrRegister = pathname.includes('login') || pathname.includes('register')

  return (
    <QueryProvider>
      <div className="flex flex-col min-h-screen">
        {!isLoginOrRegister && <Header />}

        <main className="flex-grow bg-gray-100 flex flex-col items-stretch">
          <Outlet />
        </main>

        {/* <TanStackRouterDevtools /> */}
      </div>
    </QueryProvider>
  )
}
