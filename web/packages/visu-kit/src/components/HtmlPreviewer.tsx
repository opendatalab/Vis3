import { LinkOutlined } from '@ant-design/icons'
import { Button, Form, Input, Popover, Tooltip } from 'antd'
import { useMemo, useState } from 'react'

import { TextViewer } from './CodeViewer'

export interface HtmlPreviewerProps {
  value: string
  preview?: boolean
  baseUrl?: string
}

export default function HtmlPreviewer({ value, preview, baseUrl }: HtmlPreviewerProps) {
  const processedHtml = useMemo(() => {
    if (!baseUrl) { return value }

    // 使用正则表达式替换HTML中的绝对路径
    // 匹配href和src属性中的绝对路径（以/开头但不是//开头的路径）
    return value.replace(/(href|src)=(["'])(\/(?!\/).*?)\2/gi, (match, attr, quote, path) => {
      return `${attr}=${quote}${baseUrl.replace(/\/+$/, '')}${path}${quote}`
    })
  }, [value, baseUrl])

  if (preview) {
    return (
      <iframe
        className="border-0 w-full h-full absolute z-1"
        sandbox="allow-same-origin"
        srcDoc={processedHtml}
      />
    )
  }

  return <TextViewer />
}

export function BaseUrlForm({ baseUrl, onOk }: { baseUrl: string, onOk: (baseUrl: string) => void }) {
  const [form] = Form.useForm()
  const [open, setOpen] = useState(false)

  const handleFinish = (values: any) => {
    onOk(values.baseUrl)
    setOpen(false)
  }

  const handleToggleAbs = () => {
    if (baseUrl) {
      onOk('')
      form.setFieldValue('baseUrl', baseUrl)
      setOpen(!open)
    }
  }

  return (
    <Tooltip title="将绝对路径转换为完整URL">
      <Popover
        content={(
          <Form className="w-[340px]" form={form} layout="vertical" onFinish={handleFinish}>
            <Form.Item label="Base URL" name="baseUrl" extra="效果：/abc.css => https://example.com/abc.css">
              <Input placeholder="https://example.com" />
            </Form.Item>
            <Form.Item>
              <Button block type="primary" htmlType="submit">确定</Button>
            </Form.Item>
          </Form>
        )}
        trigger="click"
        open={open}
        onOpenChange={setOpen}
      >
        <Button size="small" onClick={handleToggleAbs} type={(!baseUrl || baseUrl === '') ? 'text' : 'primary'} icon={<LinkOutlined />} />
      </Popover>
    </Tooltip>

  )
}
