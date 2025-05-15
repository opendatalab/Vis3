import { useQueryClient } from '@tanstack/react-query'
import { Form, Input, message, Modal } from 'antd'
import type { Ref } from 'react'
import { useImperativeHandle, useState } from 'react'
import { KeychainCreateBody } from '../../../api/keychain'
import { useCreateKeychain } from '../../../api/keychain.query'

export interface KeyChainFormRef {
  open: () => void
  close: () => void
}

export interface KeyChainFormProps {
  modalFormRef: Ref<KeyChainFormRef>
  onClose?: () => void
}

export default function KeyChainForm({
  modalFormRef,
  onClose,
}: KeyChainFormProps) {
  const [open, setOpen] = useState(false)
  const [form] = Form.useForm<KeychainCreateBody>()
  const queryClient = useQueryClient()
  const { mutateAsync: createKeychain } = useCreateKeychain()
  useImperativeHandle(modalFormRef, () => {
    return {
      open: () => {
        setOpen(true)
      },
      close: () => {
        setOpen(false)
        form.resetFields()
      },
    }
  })

  const handleClose = () => {
    setOpen(false)
    form.resetFields()
    onClose?.()
  }

  const handleSaveCreate = (values: KeychainCreateBody) => {
    createKeychain(values).then(() => {
      queryClient.invalidateQueries({ queryKey: ['my_keychain'] })
      handleClose()
      message.success('创建成功')
    })
  }

  const handleOk = () => {
    form.validateFields().then(values => {
      handleSaveCreate(values)
    })
  }

  return (
    <Modal open={open} onCancel={handleClose} title="添加AK&SK" okText="保存" onOk={handleOk}>
      <Form form={form} layout="vertical" name="keychain" onFinish={handleSaveCreate}>
        <Form.Item label="名称" name="name" rules={[{ required: true, message: '请输入名称' }]}>
          <Input placeholder="请输入名称" />
        </Form.Item>
        <Form.Item label="Access Key ID" name="access_key_id" rules={[{ required: true, message: '请输入Access Key ID' }]}>
          <Input placeholder="请输入Access Key ID" />
        </Form.Item>
        <Form.Item label="Secret Key ID" name="secret_key_id" rules={[{ required: true, message: '请输入Secret Key ID' }]}>
          <Input placeholder="请输入Secret Key ID" />
        </Form.Item>
      </Form>
    </Modal>
  )
}
