import Icon, { ExportOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import { useQueryClient } from '@tanstack/react-query'
import { i18n, useTranslation } from '@vis3/kit'
import { Alert, Button, Collapse, Divider, Form, FormInstance, Input, message, Select, Switch, Tooltip } from 'antd'
import type { FormProps } from 'antd/lib'
import _ from 'lodash'
import type { MutableRefObject } from 'react'

import { useEffect, useImperativeHandle, useMemo, useState } from 'react'

import DeleteSvg from '@/assets/delete.svg?react'
import { filterBucket, isBucketAccessible, ping } from '../../api/bucket'
import { useBatchCreateBucket } from '../../api/bucket.query'
import { useAllKeychains } from '../../api/keychain.query'
import { formatApiError, formatDiagnosticError } from '../../utils/request'
import PopPanel from '../PopPanel'

function resolveFieldPath(field: string, target: string): (string | number)[] {
  const replaced = field.replace(/([^.]+)$/, target)
  return replaced.split('.').map(part => (/^\d+$/.test(part) ? Number(part) : part))
}

export function pathValidator(keyOptions: any, isCreate: boolean = true): any {
  return (form: FormInstance<any>) => ({
    validator: async (_meta: any, value: string) => {
      const field = String(_meta.field || 'path')
      const endpointPath = resolveFieldPath(field, 'endpoint')
      const keychainPath = resolveFieldPath(field, 'keychain_id')
      const stylePath = resolveFieldPath(field, 'addressing_style')
      const regionPath = resolveFieldPath(field, 'region')
      const sigPath = resolveFieldPath(field, 'signature_version')
      const sslPath = resolveFieldPath(field, 'verify_ssl')

      const endpoint = form.getFieldValue(endpointPath)
      const keychain_id = form.getFieldValue(keychainPath)
      const addressing_style = form.getFieldValue(stylePath) || 'auto'
      const region = form.getFieldValue(regionPath) || undefined
      const signature_version = form.getFieldValue(sigPath) || 'auto'
      const verify_ssl = form.getFieldValue(sslPath) ?? true
      const values = form.getFieldsValue()

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
      const duplicatedPaths = _.filter(values.buckets, (item: any) => item && item.path === value && item.keychain_id === keychain_id)
      if (duplicatedPaths.length > 1) {
        return Promise.reject(new Error(i18n.t('bucketForm.pathDuplicated')))
      }

      if (isCreate) {
        try {
          const existingBuckets = await filterBucket(value, { silentErrorToast: true })
          const duplicatedPath = _.find(existingBuckets.data, (item: any) => item.keychain_id === keychain_id)

          if (duplicatedPath) {
            return Promise.reject(new Error(i18n.t('bucketForm.duplicatedPathExists')))
          }
        }
        catch (error) {
          return Promise.reject(new Error(formatApiError(error).message))
        }
      }

      try {
        const correctKey = _.find(keyOptions, _item => _item.value === keychain_id)

        if (!correctKey) {
          return Promise.reject(new Error(i18n.t('bucketForm.keychainIdRequired')))
        }

        const accessibleResp = await isBucketAccessible(
          {
            endpoint,
            keychain_id: correctKey.value,
            path: value,
            addressing_style,
            region,
            signature_version,
            verify_ssl,
          },
          { silentErrorToast: true },
        )

        const payload = _.get(accessibleResp, 'data')
        if (typeof payload === 'boolean') {
          return payload
            ? Promise.resolve()
            : Promise.reject(new Error(i18n.t('bucketForm.noPermission')))
        }

        if (payload?.accessible) {
          const detected = payload.detected_config
          if (detected) {
            if (addressing_style === 'auto' && detected.addressing_style) {
              form.setFieldValue(stylePath, detected.addressing_style)
            }
            if (!region && detected.region) {
              form.setFieldValue(regionPath, detected.region)
            }
            if (signature_version === 'auto' && detected.signature_version) {
              form.setFieldValue(sigPath, detected.signature_version)
            }
          }
          return Promise.resolve()
        }

        return Promise.reject(new Error(formatDiagnosticError(payload, 'bucketForm.noPermission')))
      }
      catch (error) {
        return Promise.reject(new Error(formatApiError(error).message))
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

export function endpointValidator(form?: Pick<FormInstance<any>, 'getFieldValue'>) {
  return {
    async validator(_meta: any, value: string) {
      if (!value) {
        return Promise.reject(new Error(i18n.t('bucketForm.endpointRequired')))
      }

      const field = String(_meta.field || 'endpoint')
      const sslPath = resolveFieldPath(field, 'verify_ssl')
      const verifySsl = form?.getFieldValue ? (form.getFieldValue(sslPath) ?? true) : true

      try {
        const result = await ping(value, verifySsl, { silentErrorToast: true })
        const payload = _.get(result, 'data')

        if (typeof payload === 'boolean') {
          return payload
            ? Promise.resolve(i18n.t('bucketForm.endpointAccessible'))
            : Promise.reject(new Error(i18n.t('bucketForm.endpointInvalid')))
        }

        if (payload?.reachable) {
          return Promise.resolve(i18n.t('bucketForm.endpointAccessible'))
        }

        return Promise.reject(new Error(formatDiagnosticError(payload, 'bucketForm.endpointInvalid')))
      }
      catch (error) {
        return Promise.reject(new Error(formatApiError(error).message))
      }
    },
  }
}

export function S3AdvancedFields({
  form,
  namePrefix = [],
}: {
  form: FormInstance<any>
  namePrefix?: (string | number)[]
}) {
  const { t } = useTranslation()

  const triggerRevalidate = () => {
    const pathField = [...namePrefix, 'path']
    const endpointField = [...namePrefix, 'endpoint']
    if (form.getFieldValue(endpointField)) {
      form.validateFields([endpointField]).catch(() => {})
    }
    if (form.getFieldValue(pathField)) {
      form.validateFields([pathField]).catch(() => {})
    }
  }

  return (
    <Collapse
      ghost
      size="small"
      className="!bg-gray-50 !rounded-md"
      items={[
        {
          key: 'advanced',
          label: <span className="text-xs text-gray-600">{t('bucketForm.advancedOptions')}</span>,
          children: (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Form.Item
                className="!mb-0"
                label={t('bucketForm.addressingStyle')}
                name={[...namePrefix, 'addressing_style']}
                initialValue="auto"
              >
                <Select
                  onChange={triggerRevalidate}
                  options={[
                    { label: t('bucketForm.addressingStyleAuto'), value: 'auto' },
                    { label: t('bucketForm.addressingStylePath'), value: 'path' },
                    { label: t('bucketForm.addressingStyleVirtual'), value: 'virtual' },
                  ]}
                />
              </Form.Item>
              <Form.Item
                className="!mb-0"
                label={t('bucketForm.signatureVersion')}
                name={[...namePrefix, 'signature_version']}
                initialValue="auto"
              >
                <Select
                  onChange={triggerRevalidate}
                  options={[
                    { label: t('bucketForm.signatureVersionAuto'), value: 'auto' },
                    { label: t('bucketForm.signatureVersionV4'), value: 's3v4' },
                    { label: t('bucketForm.signatureVersionV2'), value: 's3' },
                  ]}
                />
              </Form.Item>
              <Form.Item
                className="!mb-0"
                label={t('bucketForm.region')}
                name={[...namePrefix, 'region']}
              >
                <Input
                  placeholder={t('bucketForm.regionPlaceholder')}
                  onBlur={triggerRevalidate}
                />
              </Form.Item>
              <Form.Item
                className="!mb-0"
                label={t('bucketForm.verifySsl')}
                tooltip={t('bucketForm.verifySslTooltip')}
                name={[...namePrefix, 'verify_ssl']}
                valuePropName="checked"
                initialValue={true}
              >
                <Switch onChange={triggerRevalidate} />
              </Form.Item>
            </div>
          ),
        },
      ]}
    />
  )
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
    try {
      await batchCreateBucketMutation(values.buckets)
      message.success(t('bucketForm.pathAdded'))
      onClose()
      queryClient.invalidateQueries({ queryKey: ['bucket'] })
    }
    catch (error) {
      console.error('Failed to add bucket paths', error)
    }
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
          addressing_style: 'auto',
          signature_version: 'auto',
          verify_ssl: true,
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
                  {t('bucketForm.alertMessage')} → <Button type="link" className="!text-[var(--ant-color-primary)] !px-0" target="_blank" size="small" href={`${window.__CONFIG__.BASE_URL ?? ''}/keychain`}>{t('bucketForm.AS&SKManagement')}<ExportOutlined /></Button>
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
                        <S3AdvancedFields form={form} namePrefix={[index]} />
                        {fields.length > 1 && index < fields.length - 1 && <Divider />}
                      </div>
                    ))
                  }
                  <Button
                    className="mt-6"
                    block
                    icon={<PlusOutlined />}
                    onClick={() => add({ addressing_style: 'auto', signature_version: 'auto', verify_ssl: true })}
                  >
                    {t('bucketForm.add')}
                  </Button>
                </>
              )}
            </Form.List>
          </Form>
        </div>
      </PopPanel>
    </>
  )
}
