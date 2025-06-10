import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from '@vis3/kit'
import { Form, Input, message, Modal, Select } from 'antd'
import _ from 'lodash'
import { useEffect, useImperativeHandle, useState } from 'react'

import { useBucket, useUpdateBucket } from '../../api/bucket.query'
import { useAllKeychains } from '../../api/keychain.query'
import { endpointValidator, pathValidator } from '../BucketManager'

export interface BucketEditModalRef {
  open: (id: number) => void
}

export interface BucketEditModalProps {
  modalRef: React.RefObject<BucketEditModalRef>
}

export default function BucketEditModal({ modalRef }: BucketEditModalProps) {
  const [id, setId] = useState<number | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const { data: keyChain, isLoading } = useAllKeychains(typeof id === 'number')
  const [form] = Form.useForm()
  const { t } = useTranslation()
  const { mutateAsync: updateBucket } = useUpdateBucket()
  const queryClient = useQueryClient()
  const keychainOptions = keyChain?.map(item => ({
    label: item.name,
    value: item.id,
  }))

  useImperativeHandle(modalRef, () => ({
    open: (id: number) => {
      setId(id)
      setIsOpen(true)
    },
  }))

  const { data: editingBucket } = useBucket(id)

  useEffect(() => {
    if (editingBucket) {
      form.setFieldsValue(editingBucket)
    }
  }, [editingBucket])

  const handleCancel = () => {
    setIsOpen(false)
    setId(null)
  }

  const handleOk = async () => {
    setIsOpen(false)
    setId(null)
    const values = form.getFieldsValue()
    const endpoint = _.get(values, 'endpoint')
    const keychain_id = _.get(values, 'keychain_id')
    const path = _.get(values, 'path')
    const name = _.get(values, 'name')

    await updateBucket({
      id: id!,
      body: {
        endpoint,
        keychain_id,
        path,
        name,
      },
    })

    queryClient.invalidateQueries({ queryKey: ['bucket'] })
    message.success(t('bucketUpdated'))
  }
  return (
    <Modal title={t('editBucket')} open={isOpen} onCancel={handleCancel} onOk={handleOk} loading={isLoading}>
      <Form form={form} layout="vertical" name="bucket" initialValues={editingBucket} onFinish={handleOk}>
        <Form.Item
          label={t('bucketForm.path')}
          hasFeedback
          name="path"
          required
          validateDebounce={1000}
          rules={[pathValidator(keychainOptions)]}
        >
          <Input placeholder={t('bucketForm.pathPlaceholder')} />
        </Form.Item>
        <Form.Item
          label={t('bucketForm.endpoint')}
          name="endpoint"
          required
          hasFeedback
          validateDebounce={1000}
          rules={[{ type: 'url', message: t('bucketForm.endpointValidMessage') }, endpointValidator]}
        >
          <Input placeholder={t('bucketForm.endpointPlaceholder')} />
        </Form.Item>
        <Form.Item label={t('bucketForm.keychainId')} name="keychain_id" rules={[{ required: true, message: t('bucketForm.keychainIdRequired') }]}>
          <Select options={keychainOptions} />
        </Form.Item>
      </Form>
    </Modal>
  )
}
