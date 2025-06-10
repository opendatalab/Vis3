import { createFileRoute } from '@tanstack/react-router'
import { Alert, Button, Form, Input, Select, Tooltip } from 'antd'
import clsx from 'clsx'

import { useIsFetching, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from '@vis3/i18n'
import '@vis3/kit/dist/index.css'
import _ from 'lodash'
import { useRef } from 'react'


import { ExportOutlined, ReloadOutlined } from '@ant-design/icons'
import { useBucketQueryKey, useCachedBucket, useCreateBucket } from '../api/bucket.query'
import BlockPreviewer from '../components/BlockPreviewer'
import BucketHeader from '../components/BlockPreviewer/Header'
import type { BucketEditModalRef } from '../components/BucketEditModal'
import BucketEditModal from '../components/BucketEditModal'
import BucketManager, { endpointValidator, pathValidator, useKeyOptions } from '../components/BucketManager'
import DirectoryTree, { DirectoryTreeProvider } from '../components/DirectoryTree'


export const Route = createFileRoute('/')({
  component: RouteComponent,
})

function Empty({ className }: { className?: string }) {
  const { t } = useTranslation()
  const [form] = Form.useForm()
  const { keyOptions, isLoading, keyChainQuery } = useKeyOptions()
  const { mutateAsync: createBucketMutation, isPending } = useCreateBucket()
  const queryClient = useQueryClient()

  const onFinish = async (values: any) => {
    await createBucketMutation(values)
    queryClient.invalidateQueries({ queryKey: ['bucket'] })
    form.resetFields()
  }

  const supportedCloudPlatforms = [
    {
      name: t('supportedCloudPlatforms.huawei'),
      icon: '/huawei.png',
    },
    {
      name: t('supportedCloudPlatforms.tencent'),
      icon: '/tencent.png',
    },
    {
      name: t('supportedCloudPlatforms.sensetime'),
      icon: '/sensetime.png',
    },
    {
      name: t('supportedCloudPlatforms.aws'),
      icon: '/aws.png',
    },
    {
      name: t('supportedCloudPlatforms.aliyun'),
      icon: '/aliyun.png',
    },
    {
      name: t('supportedCloudPlatforms.inspur'),
      icon: '/inspur.png',
    },
    {
      name: t('supportedCloudPlatforms.microsoft'),
      icon: '/microsoft.png',
    },
  ]

  return (
    <div className={clsx('flex flex-col items-center justify-center bg-[url(/bg.png)] bg-cover bg-center fixed inset-0 z-10', className)}>
      {/* 产品标题和描述 */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">{t('addFirstBucket')}</h1>
        {/* <p className="text-lg text-gray-600">{t('sloganDescription')}</p> */}
      </div>

      {/* 添加路径卡片区域 */}
      {/* <div className="max-w-2xl mx-auto bg-gray-50 rounded-lg mb-8 flex flex-col items-center">
        <video src="/demo.mp4" autoPlay muted loop className="w-full h-full object-cover rounded-lg" />
      </div> */}
      {/* 添加路径按钮 */}
      <Form form={form} className='max-w-2xl' layout="vertical" onFinish={onFinish}>
        <Alert
          className="!mb-4"
          type="info"
          showIcon
          message={(
            <div>
              {t('bucketForm.alertMessage')} → <Button type="link" target="_blank" size="small" className="!text-[var(--ant-color-primary)] !px-0" href="/keychain">{t('bucketForm.AS&SKManagement')} <ExportOutlined /></Button>
            </div>
          )}
        />
        <div className="flex flex-col gap-4">
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
            name="keychain_id"
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
            name="endpoint"
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
            name="path"
            validateDebounce={1000}
            rules={
              [
                pathValidator(keyOptions)
              ]
            }
          >
            <Input placeholder={t('bucketForm.pathPlaceholder')} />
          </Form.Item>
          <Form.Item>
            <Button block type="primary" size="large" loading={isPending} onClick={form.submit}>{t('bucketForm.add')}</Button>
          </Form.Item>
        </div>
      </Form>

      {/* 底部说明文字 */}
      <div className="text-center text-gray-600 mt-4">
        <p>{t('currentSupport')}</p>

        {/* 云存储平台图标列表 */}
        <div className="flex justify-center items-center space-x-6 mt-4">
          {supportedCloudPlatforms.map(platform => (
            <div key={platform.name} className="bg-white rounded-md w-8 h-8 p-1" title={platform.name}>
              <img src={platform.icon} alt={platform.name} className="w-full h-full object-contain" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function RouteComponent() {
  const bodyRef = useRef<HTMLDivElement>(null)
  const bucketEditModalRef = useRef<BucketEditModalRef>(null)
  const [, path] = useBucketQueryKey()
  const cachedBucket = useCachedBucket()
  const fetchingCount = useIsFetching({ queryKey: ['bucket'] })

  const total = _.get(cachedBucket, 'data.total', 0)
  const showEmptyPlaceholder = !!cachedBucket && !path && total === 0 && fetchingCount === 0

  return (
    <div
      className={clsx('p-4', {
        'flex flex-1 flex-col': !showEmptyPlaceholder,
      })}
      ref={bodyRef}
    >
      <Empty className={clsx({
        block: showEmptyPlaceholder,
        hidden: !showEmptyPlaceholder,
      })}
      />
      <DirectoryTreeProvider>
        <div className={clsx('flex-col gap-4 h-[calc(100vh-88px)]', {
          hidden: showEmptyPlaceholder,
          flex: !showEmptyPlaceholder,
        })}
        >
          <BucketHeader />
          <div className="flex flex-1 min-h-0 overflow-y-auto relative gap-4">
            <DirectoryTree />
            <BlockPreviewer className='flex-1' />
          </div>
        </div>
      </DirectoryTreeProvider>
      <BucketManager showTrigger={false} />
      <BucketEditModal modalRef={bucketEditModalRef} />
    </div>
  )
}
