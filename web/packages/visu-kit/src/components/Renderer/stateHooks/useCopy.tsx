import { CopyOutlined } from '@ant-design/icons'
import { useTranslation } from '@vis3/i18n'
import { Button, Tooltip } from 'antd'
import { useCallback, useMemo, useState } from 'react'

export default function useCopy(value: string): [React.ReactNode] {
  const { t } = useTranslation()
  const [title, setTitle] = useState(t('copy'))

  const handleCopyRaw = useCallback(() => {
    try {
      if (typeof value === 'object') {
        const json = JSON.stringify(value)
        navigator.clipboard.writeText(json)
      }
      else {
        navigator.clipboard.writeText(value || '')
      }

      setTitle(t('copied'))
    }
    catch (error) {
      console.error(error)
      setTitle(t('copy'))
    }

    setTimeout(() => {
      setTitle(t('copy'))
    }, 1000)
  }, [value])

  const node = useMemo(() => (
    <Tooltip title={title}>
      <Button size="small" type="text" icon={<CopyOutlined />} onClick={handleCopyRaw} />
    </Tooltip>
  ), [title, handleCopyRaw])

  return [node]
}
