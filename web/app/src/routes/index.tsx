import { EditOutlined, LeftOutlined, PlusOutlined, RightOutlined } from '@ant-design/icons'
import { useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link, useLocation, useNavigate } from '@tanstack/react-router'
import { useTranslation } from '@visu/i18n'
import type { BucketItem, BucketParams, BucketQueryOptions } from '@visu/kit'
import { BucketHeader, BucketProvider } from '@visu/kit'
import { Button, Input, List, message, Popconfirm, Space, Tag, Tooltip } from 'antd'
import clsx from 'clsx'
import type { BucketEditModalRef } from '../components/BucketEditModal'

import '@visu/kit/dist/index.css'
import { useCallback, useMemo, useRef, useState } from 'react'
import { digBucket } from '../api/bucket'
import { useDeleteBucket } from '../api/bucket.query'
import BucketIcon from '../assets/bucket.svg?react'
import DeleteSvg from '../assets/delete.svg?react'
import BlockPreviewer from '../components/BlockPreviewer'
import BucketEditModal from '../components/BucketEditModal'
import BucketManager, { openBucketManager } from '../components/BucketManager'
import DirectoryTree, { DirectoryTreeProvider, DirectoryTreeTrigger, TreeRef } from '../components/DirectoryTree'

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
  const showPanel = () => {
    openBucketManager()
  }

  return (
    <div className={clsx('container mx-auto mt-24', className)}>
      {/* 产品标题和描述 */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">VisU – 大模型语料可视化工具</h1>
        <p className="text-lg text-gray-600">无缝对接主流云存储与本地数据源，深度解析多格式数据内容</p>
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
  const location = useLocation()
  const navigate = useNavigate()
  const bucketEditModalRef = useRef<BucketEditModalRef>(null)
  const treeRef = useRef<TreeRef>(null)
  const search = location.search as Record<string, string | number>
  const path = search.path as string || ''
  const pageSize = Number(search.page_size) || 50
  const pageNo = Number(search.page_no) || 1
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const { t } = useTranslation()

  const queryClient = useQueryClient()
  const { mutateAsync: deleteBucket } = useDeleteBucket()

  const onParamsChange = useCallback((params: Partial<BucketParams>) => {
    const { path, ...restParams } = params
    const newSearch = {} as Record<string, string | number>

    if (typeof params.path === 'string') {
      newSearch.path = path as string

      treeRef.current?.onPathSelect(params.path)
    }

    if (restParams.pageNo) {
      newSearch.page_no = restParams.pageNo
    }

    if (restParams.pageSize) {
      newSearch.page_size = restParams.pageSize
    }

    navigate({
      to: '/',
      search: { ...search, ...newSearch, id: !newSearch.path && Object.keys(restParams).length === 0 ? undefined : search.id },
    })
  }, [navigate, search])

  const handleDeleteBucket = useCallback((id: number) => {
    return deleteBucket(id).then(() => {
      message.success('删除成功')
      queryClient.invalidateQueries({ queryKey: ['bucket'] })
    })
  }, [deleteBucket, queryClient])

  const bucketQueryKey = useMemo(() => {
    if (path) {
      return ['bucket', {
        path,
        pageSize,
        pageNo,
        id: search.id,
      }]
    }

    return ['bucket']
  }, [path, pageSize, pageNo])

  const bucketQueryOptions = useMemo(() => ({
    staleTime: path ? 10000 : 0,
    queryKey: bucketQueryKey,
    queryFn: () => {
      setIsLoading(true)
      const result = digBucket({ path, pageSize, pageNo, id: search.id ? Number(search.id) : undefined }).then((res) => {
        setTotal(res.total)
        return res
      }).finally(() => {
        setIsLoading(false)
      })

      return result
    },
    select: (data: any) => data.data as BucketItem[],
  }), [bucketQueryKey])

  const showPlaceholder = !total && !isLoading && !path
  const pathWithoutQuery = path.split('?')[0]
  const showPagination = path && pathWithoutQuery.endsWith('/')

  return (
    <div
      className={clsx('p-4', {
        'flex flex-1 flex-col': !total,
      })}
      ref={bodyRef}
    >
      <Empty className={clsx({
        block: showPlaceholder,
        hidden: !showPlaceholder,
      })}
      />
      <BucketProvider
        url={path as string}
        onParamsChange={onParamsChange}
        bucketQueryOptions={bucketQueryOptions as BucketQueryOptions}
        downloadUrl="/api/v1/bucket/download"
        previewUrl="/api/v1/bucket/file_preview"
        renderBucketItem={(item) => {
          return (
            <List.Item className="!flex !items-center hover:bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <BucketIcon />
                <Link className="!hover:underline" to="/" search={{ path: `${item.path}/`, id: item.id }}>{`${item.path}/`}</Link>
                {item.name && <Tag>{item.name}</Tag>}
              </div>
              <div className="flex gap-2">
                <Button type="text" size="small" icon={<EditOutlined />} onClick={() => bucketEditModalRef.current?.open(item.id)} />
                <Popconfirm title="确定删除该路径吗？" onConfirm={() => handleDeleteBucket(item.id)}>
                  <Button danger type="text" size="small" icon={<DeleteSvg />} />
                </Popconfirm>
              </div>
            </List.Item>
          )
        }}
      >
        <DirectoryTreeProvider>
          <div className={clsx('flex-col gap-4 h-[calc(100vh-88px)]', {
            hidden: showPlaceholder,
            flex: !showPlaceholder,
          })}
          >

            <div className={clsx('bucket-header', ' flex items-center gap-2')}>
              {
                path && <DirectoryTreeTrigger />
              }
              <BucketHeader className="flex-1" />
              <>
                {
                  showPagination && (
                    <Space.Compact>
                      <Tooltip title={t('bucket.prevPage')}>
                        <Button
                          disabled={!pageNo || pageNo === 1}
                          onClick={() => onParamsChange({ pageNo: pageNo - 1 })}
                          icon={<LeftOutlined />}
                        />
                      </Tooltip>
                      <Input className="!w-16 text-center" min={1} readOnly value={pageNo ?? '1'} />
                      <Tooltip title={t('bucket.nextPage')}>
                        <Button
                          disabled={total < pageSize}
                          onClick={() => onParamsChange({ pageNo: pageNo + 1 })}
                          icon={<RightOutlined />}
                        />
                      </Tooltip>
                    </Space.Compact>
                  )
                }
                <Tooltip title="添加路径" placement="topLeft">
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => {
                      openBucketManager()
                    }}
                  />
                </Tooltip>
              </>
            </div>
            <div className="flex flex-1 min-h-0 overflow-y-auto relative gap-4">
              <DirectoryTree treeRef={treeRef} />
              <BlockPreviewer className='flex-1' path={path} />
            </div>
          </div>
        </DirectoryTreeProvider>
      </BucketProvider>
      <BucketManager showTrigger={false} />
      <BucketEditModal modalRef={bucketEditModalRef} />
    </div>
  )
}
