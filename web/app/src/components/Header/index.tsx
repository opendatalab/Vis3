import CloudSvg from '@/assets/cloud.svg?react'
import HelpSvg from '@/assets/help.svg?react'
import LocalSvg from '@/assets/local.svg?react'
import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import { useTranslation } from '@vis3/kit'
import { Avatar, Button, Dropdown, Tag } from 'antd'

import clsx from 'clsx'
import _ from 'lodash'
import { useCachedBucket } from '../../api/bucket.query'
import { useLogout, useMe } from '../../api/user.query'
import LogoSvg from '../../assets/logo.svg?react'
import AppPanel from '../AppPanel'
import LangSwitcher from '../LangSwitcher'

export default function Header() {
  const enableAuth = window.__CONFIG__.ENABLE_AUTH
  const location = useLocation()
  const { t } = useTranslation()
  const { data: me } = useMe(enableAuth)
  const navigate = useNavigate()
  const { mutateAsync: logoutAsync } = useLogout()
  const isHome = location.pathname === '/' && !(location.search as any).path
  const cachedBucket = useCachedBucket()
  const total = _.get(cachedBucket, 'data.total', 0)

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
    <header className={clsx({ "shadow-sm": isHome ? total > 0 : true }, "z-20")} id="header">
      <div className="mx-auto flex items-center justify-between py-3 px-4">
        <div className="flex items-center space-x-2">
          <Link to="/" className="text-2xl flex items-end">
            <LogoSvg className="mr-2" />
            <Tag>v{window.__CONFIG__.VERSION}</Tag>
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
          <Button type="link" className="!no-underline !text-gray-700" icon={<HelpSvg />} target="_blank" href="https://vis3.shlab.tech/docs">
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
              <Avatar className="!bg-[var(--ant-color-primary)]" alt={me?.username}>{me?.username?.slice(0, 1).toUpperCase()}</Avatar>
            </Dropdown>
          )}
        </div>
      </div>
    </header>
  )
}
