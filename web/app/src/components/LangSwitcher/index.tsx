import LangIcon from '@/assets/i18n.svg?react';
import { useTranslation } from "@visu/i18n";
import { useMemo } from "react";
import Button from '../Button';
import Menu from "../Menu";

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
];

export default function LangSwitcher() {
  const { i18n } = useTranslation();

  const lang = useMemo(() => {
    return ['zh', 'zh_CN', 'zh-CN'].includes(i18n.language) ? 'zh-CN' : 'en-US';
  }, [i18n.language]);

  const langLabel = useMemo(() => {
    return langOptions.find((item) => item.key === lang)?.label;
  }, [lang]);

  const changeLocale = (lang: string) => {
    i18n.changeLanguage(lang);
    window.location.reload();
  };

  return (
    <Menu
      triggerMode="hover"
      trigger={<Button variant='ghost' size='sm'  leftIcon={<LangIcon />}>{langLabel}</Button>}
      items={[
        {
          label: '简体中文',
          onClick: () => {
            changeLocale('zh-CN')
          }
        },
        {
          label: 'English',
          onClick: () => {
            changeLocale('en-US')
          }
        }
      ]}
    />
  )
}