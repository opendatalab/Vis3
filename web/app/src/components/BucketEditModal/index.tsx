import { useQueryClient } from '@tanstack/react-query'
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
    message.success('Bucket 已更新')
  }
  return (
    <Modal title="编辑Bucket" open={isOpen} onCancel={handleCancel} onOk={handleOk} loading={isLoading}>
      <Form form={form} layout="vertical" name="bucket" initialValues={editingBucket} onFinish={handleOk}>
        <Form.Item label="名称" name="name">
          <Input placeholder="Bucket 名称（可选）" />
        </Form.Item>
        <Form.Item
          label="S3 地址"
          hasFeedback
          name="path"
          required
          validateDebounce={1000}
          rules={[pathValidator(keychainOptions)]}
        >
          <Input placeholder="Bucket 路径" />
        </Form.Item>
        <Form.Item
          label="Endpoint"
          name="endpoint"
          required
          hasFeedback
          validateDebounce={1000}
          rules={[{ type: 'url', message: '请填写正确的url格式' }, endpointValidator]}
        >
          <Input placeholder="Bucket Endpoint" />
        </Form.Item>
        <Form.Item label="AK&SK" name="keychain_id" rules={[{ required: true, message: '请选择AK&SK' }]}>
          <Select options={keychainOptions} />
        </Form.Item>
      </Form>
    </Modal>
  )
}
