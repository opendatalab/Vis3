import { createFileRoute } from '@tanstack/react-router'
import { Button } from 'antd'
import clsx from 'clsx'
import type { BucketEditModalRef } from '../components/BucketEditModal'

import { useIsFetching } from '@tanstack/react-query'
import { useTranslation } from '@vis3/i18n'
import '@vis3/kit/dist/index.css'
import _ from 'lodash'
import { useRef } from 'react'
import { useBucketQueryKey, useCachedBucket } from '../api/bucket.query'
import BlockPreviewer from '../components/BlockPreviewer'
import BucketHeader from '../components/BlockPreviewer/Header'
import BucketEditModal from '../components/BucketEditModal'
import BucketManager, { openBucketManager } from '../components/BucketManager'
import DirectoryTree, { DirectoryTreeProvider } from '../components/DirectoryTree'

export const Route = createFileRoute('/')({
  component: RouteComponent,
})

const supportedCloudPlatforms = [
  {
    name: '华为云',
    icon: '/huawei.png',
  },
  {
    name: '腾讯云',
    icon: '/tencent.png',
  },
  {
    name: '商汤大装置AOS',
    icon: '/sensetime.png',
  },
  {
    name: 'AWS',
    icon: '/aws.png',
  },
  {
    name: '阿里云 OSS',
    icon: '/aliyun.png',
  },
  {
    name: '浪潮云',
    icon: '/inspur.png',
  },
  {
    name: '微软 Azure',
    icon: '/microsoft.png',
  },
]

function Empty({ className }: { className?: string }) {
  const { t } = useTranslation()
  
  const showPanel = () => {
    openBucketManager()
  }

  return (
    <div className={clsx('container mx-auto mt-24', className)}>
      {/* 产品标题和描述 */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Vis3 – {t('slogan')}</h1>
        <p className="text-lg text-gray-600">{t('sloganDescription')}</p>
      </div>

      {/* 添加路径卡片区域 */}
      <div className="max-w-2xl mx-auto bg-gray-50 rounded-lg mb-8 flex flex-col items-center">
        <video src="/demo.mp4" autoPlay muted loop className="w-full h-full object-cover rounded-lg" />
      </div>
      {/* 添加路径按钮 */}
      <div className="flex justify-center items-center space-x-6 mt-6">
        <Button className="mx-auto" type="primary" size="large" onClick={showPanel}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-2">
            <path d="M12 4v16m-8-8h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          添加路径
        </Button>
      </div>

      {/* 底部说明文字 */}
      <div className="text-center text-gray-600 mt-4">
        <p>请添加S3存储路径，完成访问授权，目前已支持的兼容S3协议的云存储平台如下：</p>

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
  const showPlaceholder = fetchingCount === 0 && !path && total === 0

  console.log('cachedBucket', cachedBucket)
  console.log('isFetching', showPlaceholder, fetchingCount)

  return (
    <div
      className={clsx('p-4', {
        'flex flex-1 flex-col': !showPlaceholder,
      })}
      ref={bodyRef}
    >
      <Empty className={clsx({
        block: showPlaceholder,
        hidden: !showPlaceholder,
      })}
      />
      <DirectoryTreeProvider>
        <div className={clsx('flex-col gap-4 h-[calc(100vh-88px)]', {
          hidden: showPlaceholder,
          flex: !showPlaceholder,
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
