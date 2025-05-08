import { CopyOutlined } from '@ant-design/icons'
import { Button, Tooltip } from 'antd'
import { useCallback, useMemo, useState } from 'react'

export default function useCopy(value: string): [React.ReactNode] {
  const [title, setTitle] = useState('复制内容')

  const handleCopyRaw = useCallback(() => {
    try {
      if (typeof value === 'object') {
        const json = JSON.stringify(value)
        navigator.clipboard.writeText(json)
      }
      else {
        navigator.clipboard.writeText(value || '')
      }

      setTitle('已复制')
    }
    catch (error) {
      console.error(error)
      setTitle('复制失败')
    }

    setTimeout(() => {
      setTitle('复制内容')
    }, 1000)
  }, [value])

  const node = useMemo(() => (
    <Tooltip title={title}>
      <Button size="small" type="text" icon={<CopyOutlined />} onClick={handleCopyRaw} />
    </Tooltip>
  ), [title, handleCopyRaw])

  return [node]
}
