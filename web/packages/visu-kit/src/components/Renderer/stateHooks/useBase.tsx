import { LinkOutlined } from '@ant-design/icons'
import type { FormInstance } from 'antd'
import { Button, Form, Input, Popover } from 'antd'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { BinaryButtonRef } from '../../../components/BinaryButton'
import BinaryButton from '../../../components/BinaryButton'

export default function useBase(baseUrl?: string): [React.ReactNode, { base: string, open: boolean }, (base: string) => void, FormInstance<any>] {
  const [base, setBase] = useState('')
  const [form] = Form.useForm()
  const [open, setOpen] = useState(false)
  const btnRef = useRef<BinaryButtonRef>(null)

  useEffect(() => {
    form.setFieldsValue({
      baseUrl: baseUrl ?? '',
    })
  }, [baseUrl, form])

  const handleFinish = (values: any) => {
    setBase(values.baseUrl)
    setOpen(false)
  }

  const handleChange = useCallback((_value: string) => {
    setBase(_value)
    form.setFieldsValue({
      baseUrl: _value,
    })
  }, [form])

  const handleOpenChange = useCallback(() => {
    setOpen(pre => !pre)
    btnRef.current?.setActivated(!!base)
  }, [base])

  const handleReset = useCallback(() => {
    form.resetFields()
    setBase('')
    setOpen(false)
  }, [form])

  const node = useMemo(() => (
    <Popover
      content={(
        <Form className="w-[340px]" form={form} layout="vertical" onFinish={handleFinish}>
          <Form.Item
            label="Base URL"
            extra="效果：/abc.css => https://example.com/abc.css"
            name="baseUrl"
            rules={[{
              type: 'url',
            }]}
          >
            <Input placeholder="https://example.com" />
          </Form.Item>
          <Form.Item noStyle>
            <div className="flex w-full gap-2">
              <Button className="flex-1" type="primary" htmlType="submit">确定</Button>
              <Button className="flex-1" onClick={handleReset}>清空</Button>
            </div>
          </Form.Item>
        </Form>
      )}
      trigger="click"
      open={open}
      onOpenChange={setOpen}
    >
      <BinaryButton btnRef={btnRef} activated={!!base} title="将绝对路径转换为完整URL" icon={<LinkOutlined />} onChange={handleOpenChange} />
    </Popover>
  ), [base, form, handleOpenChange, handleReset, open])

  const state = useMemo(() => ({ open, base }), [open, base])

  return [node, state, handleChange, form]
}
