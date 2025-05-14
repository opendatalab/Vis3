import { Link, useLocation, useNavigate } from "@tanstack/react-router"
import { useTranslation } from "@visu/i18n"

import AppPanel from '../AppPanel'
import Avatar from '../Avatar'

import CloudSvg from '@/assets/cloud.svg?react'
import HelpSvg from '@/assets/help.svg?react'
import LocalSvg from '@/assets/local.svg?react'
import { Button, Dropdown } from "antd"
import clsx from "clsx"
import { useLogout, useMe } from "../../api/user.query"
import LangSwitcher from "../LangSwitcher"

export default function Header() {
  const location = useLocation()
  const { t } = useTranslation()
  const { data: me } = useMe()
  const navigate = useNavigate()
  const { mutateAsync: logoutAsync } = useLogout()

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
    <header className="bg-white shadow-sm" id="header">
        <div className="mx-auto flex items-center justify-between py-3 px-4">
          <div className="flex items-center space-x-2">
            <Link to="/" className="text-2xl flex items-center">
              <img src="/logo.svg" alt="logo" className="w-8 h-8" />
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
          <div className="flex items-center space-x-2">
            <LangSwitcher />
            <AppPanel />
            <Button type="link" className="!no-underline !text-gray-700" icon={<HelpSvg />} target='_blank' href="https://help.visu.com">
              {t('documentation')}
            </Button>

            {/* 用户头像 */}
            <Dropdown
              menu={{
                items: [
                  {
                    label: '退出登录',
                    key: 'logout',
                    onClick: () => {
                      logoutAsync().then(() => {
                        navigate({ to: '/login' })
                      })
                    },
                  },
              ]}}
            >
              <Avatar className='cursor-pointer' alt={me?.username} size="sm" />
            </Dropdown>
          </div>
        </div>
      </header>
  )
}