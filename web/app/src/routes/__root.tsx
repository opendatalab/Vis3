import { createRootRouteWithContext, Outlet, useLocation } from '@tanstack/react-router'

import { QueryClient } from '@tanstack/react-query'
import Header from '../components/Header'

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
}>()({
  component: RootComponent,
})

function RootComponent() {
  // login 和 register 路由不需要头部
  const { pathname } = useLocation()
  const isLoginOrRegister = pathname.includes('login') || pathname.includes('register')

  return (
    <div className="flex flex-col min-h-screen">
      {!isLoginOrRegister && <Header />}

      <main className="flex-grow bg-gray-100 flex flex-col items-stretch">
        <Outlet />
      </main>

      {/* <TanStackRouterDevtools /> */}
    </div>
  )
}
