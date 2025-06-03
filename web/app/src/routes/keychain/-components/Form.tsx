import type { Ref } from 'react'

import { useQueryClient } from '@tanstack/react-query'
import { Form, Input, message, Modal } from 'antd'

import { useTranslation } from '@visu/i18n'
import { useImperativeHandle, useState } from 'react'
import type { KeychainCreateBody } from '../../../api/keychain'
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
  const { t } = useTranslation()
  
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
      message.success(t('keychain.added'))
    })
  }

  const handleOk = () => {
    form.validateFields().then((values) => {
      handleSaveCreate(values)
    })
  }

  return (
    <Modal open={open} onCancel={handleClose} title={t('keychain.add')} okText={t('bucketForm.save')} onOk={handleOk}>
      <Form form={form} layout="vertical" name="keychain" onFinish={handleSaveCreate}>
        <Form.Item label={t('keychain.name')} name="name" rules={[{ required: true, message: t('keychain.namePlaceholder') }]}>
          <Input placeholder={t('keychain.namePlaceholder')} />
        </Form.Item>
        <Form.Item label={t('keychain.accessKeyId')} name="access_key_id" rules={[{ required: true, message: t('keychain.accessKeyIdPlaceholder') }]}>
          <Input placeholder={t('keychain.accessKeyIdPlaceholder')} />
        </Form.Item>
        <Form.Item label={t('keychain.secretKeyId')} name="secret_key_id" rules={[{ required: true, message: t('keychain.secretKeyIdPlaceholder') }]}>
          <Input placeholder={t('keychain.secretKeyIdPlaceholder')} />
        </Form.Item>
      </Form>
    </Modal>
  )
}
