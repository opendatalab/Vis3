import CloudSvg from '@/assets/cloud.svg?react'
import LocalSvg from '@/assets/local.svg?react'
import { createRootRoute, Link, Outlet, useLocation } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { useTranslation } from '@visu/i18n'
import clsx from 'clsx'
import Button from '../components/Button'
import LangSwitcher from '../components/LangSwitcher'

import HelpSvg from '@/assets/help.svg?react'
import AppPanel from '../components/AppPanel'
import Avatar from '../components/Avatar'
import Menu from '../components/Menu'

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  const location = useLocation()
  const { t } = useTranslation()

  const links = [
    {
      to: '/',
      icon: CloudSvg,
      label: t('cloud'),
    },
    {
      to: '/local',
      icon: LocalSvg,
      label: t('local'),
    },
  ]
  
  return (
    <div className="flex flex-col min-h-screen">
      <header className="bg-white shadow-sm">
        <div className="container mx-auto flex items-center justify-between py-3 px-4">
          <div className="flex items-center space-x-2">
            <Link to="/" className="text-2xl flex items-center">
              <img src="/opendatalab.svg" alt="logo" className="w-8 h-8" />
              <span className="ml-2">VisU</span>
            </Link>

            {/* 功能导航 */}
            <div className="flex items-center ml-8 space-x-2">
              {
                links.map(link => (
                  <Link 
                    to={link.to}
                    className={clsx("flex items-center px-3 py-1 rounded transition-colors", {
                      "hover:bg-gray-100": location.pathname !== link.to,
                      "text-blue-600": location.pathname === link.to,
                    })}
                  >
                    <link.icon />
                    <span className="ml-2">{link.label}</span>
                  </Link>
                ))
              }
            </div>
          </div>

          {/* 右侧功能按钮 */}
          <div className="flex items-center space-x-4">
            <LangSwitcher />
            <AppPanel />
            <Button variant="link" size="sm" className="!no-underline !text-gray-700" leftIcon={<HelpSvg />} target='_blank' href="https://help.visu.com">
              {t('documentation')}
            </Button>

            {/* 用户头像 */}
            <Menu
              trigger={<Avatar className='cursor-pointer' alt="用户头像" size="sm" />}
              triggerMode='hover'
              items={[
                {
                  label: '退出登录',
                  onClick: () => {
                    console.log('退出登录')
                  },
                },
              ]}
            />
          </div>
        </div>
      </header>

      {/* 页面内容 */}
      <main className="flex-grow bg-gray-100">
        <Outlet />
      </main>

      {/* 开发工具，仅在开发环境显示 */}
      <TanStackRouterDevtools />
    </div>
  )
}
