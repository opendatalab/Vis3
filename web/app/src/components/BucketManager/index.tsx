import Icon, { ExportOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import { useQueryClient } from '@tanstack/react-query'
import { i18n, useTranslation } from '@vis3/kit'
import { Alert, Button, Divider, Form, FormInstance, Input, message, Select, Tooltip } from 'antd'
import type { FormProps } from 'antd/lib'
import _ from 'lodash'
import type { MutableRefObject } from 'react'

import { useEffect, useImperativeHandle, useMemo, useState } from 'react'

import DeleteSvg from '@/assets/delete.svg?react'
import { filterBucket, isBucketAccessible, ping } from '../../api/bucket'
import { useBatchCreateBucket } from '../../api/bucket.query'
import { useAllKeychains } from '../../api/keychain.query'
import PopPanel from '../PopPanel'

export function pathValidator(keyOptions: any, isCreate: boolean = true): any {
  return (form: FormInstance<any>) => ({
    validator: async (_meta: any, value: string) => {
      const values = form.getFieldsValue()
      const endpoint = _.get(values, _meta.field.replace('path', 'endpoint'))
      const keychain_id = _.get(values, _meta.field.replace('path', 'keychain_id'))

      if (!keychain_id) {
        return Promise.reject(new Error(i18n.t('bucketForm.keychainIdRequired')))
      }

      if (!endpoint) {
        return Promise.reject(new Error(i18n.t('bucketForm.endpointRequired')))
      }

      if (!value) {
        return Promise.reject(new Error(i18n.t('bucketForm.pathRequired')))
      }

      if (!value.startsWith('s3://')) {
        return Promise.reject(new Error(i18n.t('bucketForm.pathValidMessage')))
      }

      // 同一个keychain下，path不能重复
      let duplicatedPaths = _.filter(values.buckets, (item: any) => item.path === value && item.keychain_id === keychain_id)
      if (duplicatedPaths.length > 1) {
        return Promise.reject(new Error(i18n.t('bucketForm.pathDuplicated')))
      }

      
      if (isCreate) {
        // 检查服务器有无重复路径
        const existingBuckets = await filterBucket(value)
        const duplicatedPath = _.find(existingBuckets.data, (item: any) => item.keychain_id === keychain_id)

        if (duplicatedPath) {
          return Promise.reject(new Error(i18n.t('bucketForm.duplicatedPathExists')))
        }
      }

      try {
        const correctKey = _.find(keyOptions, _item => _item.value === keychain_id)

        if (!correctKey) {
          return Promise.reject(new Error(i18n.t('bucketForm.keychainIdRequired')))
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
          return Promise.reject(new Error(i18n.t('bucketForm.noPermission')))
        }
      }
      catch (error) {
        return Promise.reject(new Error(_.get(error, 'message')))
      }
    },
  })
}
export const OPEN_BUCKET_MANAGER_EVENT = 'open-bucket-manager'

export function openBucketManager(initialValues?: any) {
  const event = new CustomEvent(OPEN_BUCKET_MANAGER_EVENT, {
    detail: initialValues,
  })
  document.dispatchEvent(event)
}

export function endpointValidator() {
  return {
    async validator(_meta: any, value: string) {
      if (!value) {
        return Promise.reject(new Error(i18n.t('bucketForm.endpointRequired')))
      }

      const result = await ping(value)

      if (_.get(result, 'data', false)) {
        return Promise.resolve(i18n.t('bucketForm.endpointAccessible'))
      }

      return Promise.reject(new Error(i18n.t('bucketForm.endpointInvalid')))
    },
  }
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

export function useKeyOptions() {
  const { data: keyChain, isLoading, ...keyChainQuery } = useAllKeychains()

  const keyOptions = useMemo(() => {
    return _.map(keyChain, (item) => {
      return {
        label: item.name,
        value: item.id,
        access_key_id: item.access_key_id,
      }
    })
  }, [keyChain])

  return {
    keyOptions,
    isLoading,
    keyChainQuery,
  }
}

export default function BucketManager({ modalRef, className, showTrigger = true }: BucketCreateFormProps) {
  const [open, setOpen] = useState(false)
  const [form] = Form.useForm()
  const { t } = useTranslation()
  const { keyOptions, isLoading, keyChainQuery } = useKeyOptions()
  const { mutateAsync: batchCreateBucketMutation, isPending } = useBatchCreateBucket()
  const queryClient = useQueryClient()

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

  const onFinish: FormProps['onFinish'] = async (values) => {
    if (_.size(values?.buckets) === 0) {
      message.error(t('bucketForm.atLeastOnePath'))
      return
    }
    await batchCreateBucketMutation(values.buckets)
    message.success(t('bucketForm.pathAdded'))
    onClose()
    queryClient.invalidateQueries({ queryKey: ['bucket'] })
  }

  const handleSave = () => {
    form.submit()
  }

  const initialValues = useMemo(() => {
    return {
      buckets: [
        {
          keychain_id: keyOptions[0]?.value,
          endpoint: '',
          path: '',
        }
      ]
    }
  }, [keyOptions])

  return (
    <>
      {showTrigger && <Tooltip title={t('bucketForm.triggerTooltipMessage')} placement="bottomLeft"><Button className={className} onClick={() => setOpen(true)} type="primary" icon={<PlusOutlined />}>{t('bucketForm.addBucket')}</Button></Tooltip>}
      <PopPanel
        isOpen={open}
        onClose={onClose}
        title={t('bucketForm.addBucket')}
        width={600}
        offset={{
          right: 16,
          top: 72,
          bottom: 16,
        }}
        footer={(
          <div className="flex gap-2">
            <Button type="primary" loading={isPending} onClick={handleSave}>{t('bucketForm.save')}</Button>
            <Button type="default" onClick={onClose}>{t('bucketForm.cancel')}</Button>
          </div>
        )}
      >
        <div className="">
          <Form form={form} layout="vertical" onFinish={onFinish} initialValues={initialValues}>
            <Alert
              className="!mb-4"
              type="info"
              showIcon
              message={(
                <div>
                  {t('bucketForm.alertMessage')} → <Button type="link" className="!text-[var(--ant-color-primary)] !px-0" target="_blank" size="small" href="/keychain">{t('bucketForm.AS&SKManagement')}<ExportOutlined /></Button>
                </div>
              )}
            />
            <Form.List name="buckets">
              {(fields, { add, remove }) => (
                <>
                  {
                    fields.map((field, index) => (
                      <div key={field.key} className="flex flex-col gap-4">
                        <div className="flex justify-between items-center mb-4">

                          <span className="font-bold text-black">
                            {t('bucketForm.path')} &nbsp;
                            {index + 1}
                          </span>
                          <Tooltip title={t('bucketForm.remove')}>
                            <Button size="small" type="text" danger icon={<Icon component={DeleteSvg} />} onClick={() => remove(index)} />
                          </Tooltip>
                        </div>
                        <Form.Item
                          className="!mb-0"
                          label={(
                            <div className="flex items-center gap-2">
                              AK&SK
                              <Tooltip title={t('bucketForm.refresh')}>
                                <Button type="text" size="small" icon={<ReloadOutlined />} loading={keyChainQuery.isFetching} onClick={() => keyChainQuery.refetch()} />
                              </Tooltip>
                            </div>
                          )}
                          required
                          name={[index, 'keychain_id']}
                          rules={[{ required: true, message: t('bucketForm.keychainIdRequired') }]}
                        >
                          <Select
                            className="w-full"
                            loading={isLoading}
                            options={keyOptions}
                            placeholder={t('bucketForm.keychainIdRequired')}
                            optionRender={item => (
                              <div className="flex flex-col gap-1">
                                {item.label}
                                <span className="text-gray-400">
                                  {item.data.access_key_id}
                                </span>
                              </div>
                            )}
                          />
                        </Form.Item>
                        <Form.Item
                          label="Endpoint"
                          required
                          hasFeedback
                          className="!mb-0"
                          name={[index, 'endpoint']}
                          validateDebounce={1000}
                          rules={
                            [
                              { type: 'url', message: t('bucketForm.endpointValidMessage') },
                              endpointValidator,
                            ]
                          }
                        >
                          <Input placeholder={t('bucketForm.endpointPlaceholder')} />
                        </Form.Item>
                        <Form.Item
                          label={t('bucketForm.path')}
                          tooltip={t('bucketForm.pathTooltip')}
                          required
                          hasFeedback
                          className="!mb-0"
                          name={[index, 'path']}
                          validateDebounce={1000}
                          rules={
                            [
                              pathValidator(keyOptions)
                            ]
                          }
                        >
                          <Input placeholder={t('bucketForm.pathPlaceholder')} />
                        </Form.Item>
                        {fields.length > 1 && index < fields.length - 1 && <Divider />}
                      </div>
                    ))
                  }
                  <Button className="mt-6" block icon={<PlusOutlined />} onClick={() => add()}>{t('bucketForm.add')}</Button>
                </>
              )}
            </Form.List>
          </Form>
        </div>
      </PopPanel>
    </>
  )
}
