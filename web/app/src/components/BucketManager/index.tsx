import Icon, { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import { Alert, Button, Divider, Form, Input, message, Select, Steps, Tooltip } from 'antd'
import type { FormProps } from 'antd/lib'
import _ from 'lodash'
import type { MutableRefObject } from 'react'
import { useEffect, useImperativeHandle, useMemo, useState } from 'react'

import DeleteSvg from '@/assets/delete.svg?react'
import { isBucketAccessible, ping } from '../../api/bucket'
import { useAllKeychains } from '../../api/keychain.query'
import PopPanel from '../PopPanel'

function gid() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

export const OPEN_BUCKET_MANAGER_EVENT = 'open-bucket-manager'

export const openBucketManager = (initialValues?: any) => {
  const event = new CustomEvent(OPEN_BUCKET_MANAGER_EVENT, {
    detail: initialValues,
  })
  document.dispatchEvent(event)
}

async function endpointAccessibleValidator(_meta: any, value: string) {
  if (!value) {
    return Promise.reject(new Error('请填写Endpoint'))
  }

  const result = await ping(value)

  if (_.get(result, 'data', false)) {
    return Promise.resolve('Endpoint可访问')
  }

  return Promise.reject(new Error('此Endpoint无法访问'))
}

export interface BucketCreateFormProps {
  modalRef?: MutableRefObject<BucketCreateFormRef | undefined>
  className?: string
  showTrigger?: boolean
}

export interface BucketCreateFormRef {
  open: (initialValues?: any) => void
  close: () => void
}

export default function BucketManager({ modalRef, className, showTrigger = true }: BucketCreateFormProps) {
  const [open, setOpen] = useState(false)
  const [form] = Form.useForm()
  const { data: keyChain, isLoading, ...keyChainQuery } = useAllKeychains()

  console.log('keyChain', keyChain)

  useEffect(() => {
    const handleOpenOutside = (e: CustomEvent) => {
      form.resetFields()
      if (e.detail) {
        setTimeout(() => {
          form.setFieldsValue(e.detail)
        })
      }
      setOpen(true)
    }

    document.addEventListener(OPEN_BUCKET_MANAGER_EVENT, handleOpenOutside as EventListener)

    return () => {
      document.removeEventListener(OPEN_BUCKET_MANAGER_EVENT, handleOpenOutside as EventListener)
    }
  }, [form, open])

  useImperativeHandle(modalRef, () => ({
    open: (initialValues?: any) => {
      form.resetFields()
      if (initialValues) {
        setTimeout(() => {
          form.setFieldsValue(initialValues)
        })
      }
      setOpen(true)
    },
    close: () => {
      form.resetFields()
      setOpen(false)
    },
  }))

  const onClose = () => {
    form.resetFields()
    setOpen(false)
  }

  const [current, setCurrent] = useState(0)

  const onChange = (value: number) => {
    setCurrent(value)
  }

  const onFinish: FormProps['onFinish'] = async (values) => {
    if (_.size(values?.buckets) === 0) {
      message.error('请至少添加一个地址')
      return
    }
    // await bucketConfigCreateMutation.mutateAsync({
    //   items: _.map(values.buckets, (item) => {
    //     return {
    //       key_chain_id: values.key_chain_id,
    //       endpoint: item.endpoint,
    //       path: item.path,
    //       name: `bucket-${gid()}`,
    //     }
    //   }),
    // })
  }

  const handleSave = () => {
    form.submit()
  }

  const keyOptions = useMemo(() => {
    return _.map(keyChain, (item) => {
      return {
        label: item.name,
        value: item.id,
        ak_sk: `${item.access_key}/${item.secret_key}`,
        accessKey: item.access_key,
      }
    })
  }, [keyChain])

  const pathValidator = async (_meta: any, value: string) => {
    const values = form.getFieldsValue()
    const endpoint = _.get(values, _meta.field.replace('path', 'endpoint'))

    if (!values.key_chain_id) {
      return Promise.reject(new Error('请选择AK&SK'))
    }

    if (!endpoint) {
      return Promise.reject(new Error('请先填写Endpoint'))
    }

    if (!value) {
      return Promise.reject(new Error('请填写S3存储地址'))
    }

    if (!value.startsWith('s3://')) {
      return Promise.reject(new Error('S3路径格式错误，必须以s3://开头'))
    }

    try {
      const correctKey = _.find(keyOptions, _item => _item.value === values.key_chain_id)

      if (!correctKey) {
        return Promise.reject(new Error('没有对应的AK&SK'))
      }

      const accessibleResult = await isBucketAccessible({
        endpoint,
        keychain_id: correctKey.value,
        path: value,
      })

      if (_.get(accessibleResult, 'data')) {
        return Promise.resolve()
      }
      else {
        return Promise.reject(new Error('所选的 AK&SK 暂无查看此地址权限'))
      }
    }
    catch (error) {
      return Promise.reject(new Error(_.get(error, 'message')))
    }
  }

  return (
    <>
      {showTrigger && <Tooltip title="添加Bucket或对象地址" placement="bottomLeft"><Button className={className} onClick={() => setOpen(true)} type="primary" icon={<PlusOutlined />}>添加地址</Button></Tooltip>}
      <PopPanel 
        isOpen={open} 
        onClose={onClose}
        title="添加 S3 路径"
        width={600}
        offset={{
          right: 16,
          top: 72,
          bottom: 16
        }}
      >
      {/* <Drawer
        width={800}
        title="添加地址"
        onClose={onClose}
        className={styles.bucketDrawer}
        destroyOnClose
        open={open}
        footer={(
          <div className="flex items-center gap-2">
            <Button type="primary" onClick={handleSave}>保存</Button>
            <Button type="text" onClick={onClose}>取消</Button>
          </div>
        )}
      > */}
        <div className="">
          <Form form={form} layout="vertical" onFinish={onFinish}>
            <Steps
              className="w-full"
              current={current}
              onChange={onChange}
              direction="vertical"
              items={[
                {
                  title: '选择AK&SK',
                  description: (
                    <div className="flex flex-col">
                      <Alert
                        className="!mb-4"
                        type="info"
                        showIcon
                        message={(
                          <div>
                            请选择或添加对目标路径有访问权限的AK/SK（前往
                              <Button type="link" target="_blank" size="small" className="!px-0" href="/keychain">AK&SK 管理</Button>
                              添加）
                          </div>
                        )}
                      />

                      <Form.Item
                        label={(
                          <div className="flex items-center gap-2">
                            AK&SK
                            <Tooltip title="刷新密钥">
                              <Button type="text" size="small" icon={<ReloadOutlined />} loading={keyChainQuery.isFetching} onClick={() => keyChainQuery.refetch()} />
                            </Tooltip>
                          </div>
                        )}
                        required
                        name="key_chain_id"
                        rules={[{ required: true, message: '请选择AK&SK' }]}
                      >
                        <Select
                          className="w-full"
                          loading={isLoading}
                          options={keyOptions}
                          optionRender={item => (
                            <div className="flex flex-col gap-1">
                              {item.label}
                              <span className="text-gray-400">
                                {item.data.accessKey}
                              </span>
                            </div>
                          )}
                        />
                      </Form.Item>
                    </div>
                  ),
                },
                {
                  title: <span className="text-black">填写地址</span>,
                  description: (
                    <div className="">
                      <div className="mb-8">
                        填写需要可视化查看的 Bucket /对象地址
                      </div>
                      <Form.List name="buckets">
                        {(fields, { add, remove }) => (
                          <>
                            {
                              fields.map((field, index) => (
                                <div key={field.key} className="flex flex-col gap-4">
                                  <div className="flex justify-between items-center mb-4">

                                    <span className="font-bold text-black">
                                      地址 &nbsp;
                                      {index + 1}
                                    </span>
                                    <Tooltip title="移除地址">
                                      <Button size="small" type="text" danger icon={<Icon component={DeleteSvg} />} onClick={() => remove(index)} />
                                    </Tooltip>
                                  </div>
                                  <Form.Item
                                    label="Endpoint"
                                    required
                                    hasFeedback
                                    className="!mb-0"
                                    name={[index, 'endpoint']}
                                    validateDebounce={1000}
                                    rules={
                                      [
                                        { type: 'url', message: '请填写正确的url格式' },
                                        { type: 'string', validator: endpointAccessibleValidator },
                                      ]
                                    }
                                  >
                                    <Input />
                                  </Form.Item>
                                  <Form.Item
                                    label="S3存储地址"
                                    tooltip="检查可访问的时限为30秒，若超时则判定为不可访问"
                                    required
                                    hasFeedback
                                    className="!mb-0"
                                    name={[index, 'path']}
                                    validateDebounce={1000}
                                    rules={
                                      [
                                        { type: 'string', validator: pathValidator },
                                      ]
                                    }
                                  >
                                    <Input />
                                  </Form.Item>
                                  {fields.length > 1 && index < fields.length - 1 && <Divider />}
                                </div>
                              ))
                            }
                            <Button className="mt-6" block icon={<PlusOutlined />} onClick={() => add()}>增加地址</Button>
                          </>
                        )}
                      </Form.List>
                    </div>
                  ),
                },
              ]}
            />
          </Form>
        </div>
        </PopPanel>
      {/* </Drawer> */}
    </>
  )
}
