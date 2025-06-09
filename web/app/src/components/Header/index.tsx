import CloudSvg from '@/assets/cloud.svg?react'
import HelpSvg from '@/assets/help.svg?react'
import LocalSvg from '@/assets/local.svg?react'
import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import { useTranslation } from '@vis3/i18n'
import { Button, Dropdown } from 'antd'

import clsx from 'clsx'
import { useLogout, useMe } from '../../api/user.query'
import AppPanel from '../AppPanel'
import Avatar from '../Avatar'
import LangSwitcher from '../LangSwitcher'

export default function Header() {
  const enableAuth = window.__CONFIG__.ENABLE_AUTH
  const location = useLocation()
  const { t } = useTranslation()
  const { data: me } = useMe(enableAuth)
  const navigate = useNavigate()
  const { mutateAsync: logoutAsync } = useLogout()
  const isHome = location.pathname === '/'

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
    <header className={clsx({ "shadow-sm": !isHome }, "z-20")} id="header">
      <div className="mx-auto flex items-center justify-between py-3 px-4">
        <div className="flex items-center space-x-2">
          <Link to="/" className="text-2xl flex items-center">
            <img src="/logo.svg" alt="logo" className="w-8 h-8" />
            <span className="ml-2">Vis3</span>
          </Link>

          {/* 功能导航 */}
          <div className="flex items-center ml-8 space-x-2">
            {
              links.map(link => (
                <Link
                  to={link.to}
                  className={clsx('flex items-center px-3 py-1 rounded transition-colors', {
                    'hover:!bg-gray-100': location.pathname !== link.to,
                    '!text-[var(--ant-color-primary)]': location.pathname === link.to,
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
        <div className="flex items-center space-x-2">
          <LangSwitcher />
          <AppPanel />
          <Button type="link" className="!no-underline !text-gray-700" icon={<HelpSvg />} target="_blank" href="https://help.visu.com">
            {t('documentation')}
          </Button>

          {/* 用户头像 */}
          {enableAuth && (
            <Dropdown
              menu={{
                items: [
                  {
                    label: t('bucketForm.AS&SKManagement'),
                    key: 'keychain',
                    onClick: () => {
                      navigate({ to: '/keychain' })
                    },
                  },
                  {
                    label: t('logout'),
                    key: 'logout',
                    onClick: () => {
                      logoutAsync().then(() => {
                        navigate({ to: '/login' })
                      })
                    },
                  },
                ],
              }}
            >
              <Avatar className="cursor-pointer" alt={me?.username} size="sm" />
            </Dropdown>
          )}
        </div>
      </div>
    </header>
  )
}
