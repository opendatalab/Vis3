import type { QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, Outlet, useLocation } from '@tanstack/react-router'

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
    <div className="flex flex-col min-h-screen css-var-r0 css-var-r1">
      {!isLoginOrRegister && <Header />}

      <main className="flex-grow flex flex-col items-stretch">
        <Outlet />
      </main>
    </div>
  )
}
