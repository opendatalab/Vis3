import LangIcon from '@/assets/i18n.svg?react';
import { useTranslation } from '@vis3/kit';
import { Button, Dropdown } from 'antd';
import { useMemo } from 'react';

const langOptions = [
  {
    key: 'zh-CN',
    label: '简体中文',
    value: 'zh-CN',
  },
  {
    key: 'en-US',
    label: 'English',
    value: 'en-US',
  },
]

export default function LangSwitcher() {
  const { i18n } = useTranslation()

  const lang = useMemo(() => {
    // currently not support zh-HK, zh-TW
    return ['zh', 'zh_CN', 'zh-CN', 'zh-HK', 'zh-TW'].includes(i18n.language) ? 'zh-CN' : 'en-US'
  }, [i18n.language])

  const langLabel = useMemo(() => {
    return langOptions.find(item => item.key === lang)?.label
  }, [lang])

  const changeLocale = (lang: string) => {
    i18n.changeLanguage(lang)
    window.location.reload()
  }

  return (
    <Dropdown
      menu={{
        selectedKeys: [lang],
        items: [
          {
            label: '简体中文',
            key: 'zh-CN',
            onClick: () => {
              changeLocale('zh-CN')
            },
          },
          {
            label: 'English',
            key: 'en-US',
            onClick: () => {
              changeLocale('en-US')
            },
          },
        ],
      }}
    >
      <Button size="middle" type="text" icon={<LangIcon />}>{langLabel}</Button>
    </Dropdown>
  )
}
