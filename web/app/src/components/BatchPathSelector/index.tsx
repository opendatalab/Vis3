import type { CollapseProps } from 'antd/es/collapse'
import { ClearOutlined, CloseOutlined, LinkOutlined, MenuOutlined } from '@ant-design/icons'
import { useLocation } from '@tanstack/react-router'
import { Button, Collapse, Form, Input, List, Popover } from 'antd'
import clsx from 'clsx'
import { useMemo, useState } from 'react'

import styles from './index.module.css'

interface FormValues {
  paths: string
}

function OverlayContent({ onClose }: { onClose?: () => void }) {
  const [form] = Form.useForm()
  const searchParams = new URLSearchParams(useLocation().search)
  const currentPath = useMemo(() => searchParams.get('path'), [searchParams])
  const initialPaths = useMemo(() => {
    const value = localStorage.getItem('bucket::paths')

    try {
      return JSON.parse(value ?? '[]')
    }
    catch (error) {
      console.error(error)
    }

    return []
  }, [])
  const [validPaths, setValidPaths] = useState<string[]>(initialPaths)
  const defaultFormValues = useMemo(() => ({ paths: validPaths.join('\n') }), [validPaths])

  const handleFinish = (values: FormValues) => {
    const _validPaths = values.paths
      .split('\n')
      .filter(path => path.trim().startsWith('s3://'))
      .filter((path, index, self) => self.indexOf(path) === index) // 去重

    localStorage.setItem('bucket::paths', JSON.stringify(_validPaths))
    setValidPaths(_validPaths)
  }

  const handleRemove = (path: string) => () => {
    const _validPaths = validPaths.filter(item => item !== path)
    localStorage.setItem('bucket::paths', JSON.stringify(_validPaths))
    setValidPaths(_validPaths)
  }

  const handleClear = () => {
    localStorage.removeItem('bucket::paths')
    setValidPaths([])
  }

  const items: CollapseProps['items'] = [
    {
      key: '1',
      label: '输入路径',
      children: (
        <Form form={form} layout="vertical" initialValues={defaultFormValues} onFinish={handleFinish}>
          <Form.Item label="" name="paths">
            <Input.TextArea rows={10} placeholder="按回车分隔，每个路径以s3://开头" />
          </Form.Item>
          <Form.Item className="!m-0">
            <div className="flex gap-4">
              <Button type="primary" block onClick={form.submit}>
                保存
              </Button>
              <Button onClick={onClose} block>
                关闭
              </Button>
            </div>
          </Form.Item>
        </Form>
      ),
    },
  ]

  return (
    <div className={clsx('w-[320px] max-h-[calc(100vh-8rem)] flex flex-col', styles.content)}>
      <div className="flex items-center justify-between">
        <div className="font-bold text-md">
          路径批量检索（
          {validPaths.length}
          {' '}
          条）
        </div>
        <Button type="link" onClick={handleClear} icon={<ClearOutlined />}>
          清空
        </Button>
      </div>
      <div className="flex-1 min-h-0 overflow-auto">
        <List
          size="small"
          dataSource={validPaths}
          bordered
          renderItem={(item) => {
            return (
              <List.Item
                className={clsx(
                  {
                    'bg-blue-100': currentPath === item,
                  },
                  'flex justify-between items-center gap-2',
                )}
              >
                <div className="flex items-center gap-1">
                  <LinkOutlined />
                  <a href={`?path=${item}`} className="break-all">
                    {item}
                  </a>
                </div>
                <Button
                  size="small"
                  shape="circle"
                  type="text"
                  danger
                  icon={<CloseOutlined />}
                  onClick={handleRemove(item)}
                />
              </List.Item>
            )
          }}
        />
      </div>
      <Collapse defaultActiveKey={['1']} items={items} ghost className="!p-0" />
    </div>
  )
}

export default function BatchPathSelector() {
  const [open, setOpen] = useState(false)

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
  }

  return (
    <Popover
      open={open}
      overlayClassName={styles.popover}
      onOpenChange={handleOpenChange}
      content={<OverlayContent onClose={() => setOpen(false)} />}
      title={null}
      trigger={['click']}
    >
      <Button icon={<MenuOutlined />}>批量检索</Button>
    </Popover>
  )
}
