import type { BucketBlockProps } from '@vis3/kit'
import { BucketBlock, FileIcon, getBasename, getPathType, useTranslation } from '@vis3/kit'
import clsx from 'clsx'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { EditOutlined, KeyOutlined } from '@ant-design/icons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import { Button, List, message, Modal, Popconfirm, Tag } from 'antd'
import { correctPath } from './Header'

import BucketIcon from '@/assets/bucket.svg?react'
import DeleteSvg from '@/assets/delete.svg?react'
import { BucketDataWithFullPath, deleteBucket, digBucket, filterBucket } from '../../api/bucket'
import { ROOT_BLOCK_ID } from '../../constant'
import { download, gid } from '../../utils'
import BucketEditModal, { BucketEditModalRef } from '../BucketEditModal'

import _ from 'lodash'
import { useCachedBucket } from '../../api/bucket.query'
import styles from './index.module.css'

interface ExtendedInfoItem  {
  id: string
  path: string
  bucketId: number
}

export interface BlockPreviewerProps {
  className?: string
}

export interface BucketBlockWrapperProps extends Omit<BucketBlockProps<BucketDataWithFullPath>, 'id' | 'path' | 'pathType'> {
  pageSize?: number
  pageNo?: number
  block: ExtendedInfoItem
  updateBlock?: (id: string, values: Partial<ExtendedInfoItem>) => void
  onLinkClick?: (inputPath: string) => void
}

function BucketBlockWrapper({ block, onClose, pageSize: propPageSize = 50, pageNo: propPageNo = 1, updateBlock, onLinkClick, ...props }: BucketBlockWrapperProps) {
  const { path, id, bucketId } = block
  const [pageSize, setPageSize] = useState(propPageSize)
  const [pageNo, setPageNo] = useState(propPageNo)
  const navigate = useNavigate()
  const location = useLocation()
  const search = location.search as Record<string, string | number>
  
  const bucketQueryKey = useMemo(() => {
    if (path) {
      return ['bucket', {
        path,
        pageSize,
        pageNo,
        id: bucketId,
      }]
    }

    return ['bucket']
  }, [path, pageSize, pageNo, bucketId])

  useEffect(() => {
    if (id === ROOT_BLOCK_ID) {
      setPageNo(propPageNo)
    }
  }, [propPageNo])

  useEffect(() => {
    if (id === ROOT_BLOCK_ID) {
      setPageSize(propPageSize)
    }
  }, [propPageSize])

  const bucketQueryOptions = useMemo(() => ({
    staleTime: path ? 10000 : 0,
    queryKey: bucketQueryKey,
    queryFn: () => {
      const result = digBucket({ path, pageSize, pageNo, id: id === ROOT_BLOCK_ID && bucketId ? Number(bucketId) : undefined }).then((res) => {
        return res
      })

      return result
    },
    select: (data: any) => data.data as BucketDataWithFullPath[],
  }), [bucketQueryKey])

  const { data, isLoading } = useQuery(bucketQueryOptions)

  const handlePathCorrection = useCallback((path: string) => {
    if (id === ROOT_BLOCK_ID) {
      correctPath(path)
    }
  }, [id])

  const handleOnChange = useCallback((params: Partial<{
    pageSize?: number
    pageNo?: number
    path?: string
  }>) => {
    if (id === ROOT_BLOCK_ID) {
      const { path, ...restParams } = params
      const newSearch = {} as Record<string, string | number>

      if (typeof params.path === 'string') {
        newSearch.path = path as string
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
    } else {
      if (params.pageSize) {
        setPageSize(params.pageSize)
      }

      if (params.pageNo) {
        setPageNo(params.pageNo)
      }
    }

    updateBlock?.(id, {
      path: params.path,
    })
  }, [id, search, updateBlock])
  
  const handleOpenInNewTab = useCallback((path: string) => {
    window.open(`${window.location.origin}${window.location.pathname}?path=${encodeURIComponent(path)}&pageSize=${pageSize}&pageNo=${pageNo}`, '_blank', 'noopener,noreferrer')
  }, [pageSize, pageNo, bucketId])

  const isRootBlock = id === ROOT_BLOCK_ID
  const pathType = getPathType(path)

  return (
    <BucketBlock
      id={block.id}
      path={block.path}
      loading={isLoading}
      dataSource={data}
      onClose={onClose}
      onPathCorrection={handlePathCorrection}
      onDownload={download}
      previewUrl={`${window.__CONFIG__.BASE_URL ?? ''}/api/v1/bucket/preview?id=${bucketId}`}
      showGoParent={!isRootBlock && !!path}
      showPagination={!isRootBlock && pathType === 'folder'}
      onChange={handleOnChange}
      closeable={!isRootBlock}
      onOpenInNewTab={handleOpenInNewTab}
      showOpenInNewTab={!isRootBlock}
      onLinkClick={onLinkClick}
      {...props}
    />
  )
}

export default function BlockPreviewer({ className }: BlockPreviewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const bucketEditModalRef = useRef<BucketEditModalRef>(null)
  const location = useLocation()
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const search = location.search as Record<string, string | number>
  const bucketId = search.id as number
  const path = search.path as string || ''
  const basename = getBasename(path)
  const pageSize = Number(search.page_size) || 50
  const pageNo = Number(search.page_no) || 1
  const pathType = getPathType(basename) || 'txt'
  const [blocks, setBlocks] = useState<ExtendedInfoItem[]>([{
    id: ROOT_BLOCK_ID,
    path,
    bucketId,
  }])

  useEffect(() => {
    setBlocks(pre => ([
      {
        ...pre[0],
        bucketId,
      },
      ...pre.slice(1),
    ]))
  }, [bucketId])

  const updateBlock = useCallback((id: string, values: Partial<ExtendedInfoItem>) => {
    // 更新block
    setBlocks((pre) => {
      return pre.map((_block) => {
        if (_block.id === id) {
          return {
            ..._block,
            ...values,
          }
        }

        return _block
      })
    })
  }, [])

  useEffect(() => {
    // 更新第一个block
    setBlocks(pre => ([
      {
        ...pre[0],
        path,
        pathType,
      },
    ]))
  }, [path, pathType])

  const handleS3PathClick = useCallback(async (inputPath: string) => {
    const resp = await filterBucket(inputPath)

    if (resp.data.length > 1) {
      Modal.info({
        title: t('bucket.duplicatedBuckets'),
        content: (
          <List
            size="small"
            bordered
            dataSource={resp.data.map(item => ({
              name: item.name,
              path: item.path,
              id: item.id,
            }))}
            renderItem={(item) => (
              <List.Item className={clsx(styles.listItem, "flex! items-center!")}>
                <div className="flex items-center gap-2">
                  <BucketIcon />
                  <a href="javascript:void(0)" className="!hover:underline" onClick={() => {
                    setBlocks(pre => ([
                      ...pre.slice(0, 1),
                      ...pre.slice(1),
                      {
                        id: gid(),
                        path: item.path,
                        bucketId: item.id,
                      } as ExtendedInfoItem,
                    ]))
                    Modal.destroyAll()
                  }}>{`${item.path}/`}</a>
                  {item.name && <Tag>{item.name}</Tag>}
                </div>
              </List.Item>
            )}
          />
        ),
      })
    } else if (resp.data && resp.data.length) {
      setBlocks(pre => ([
        ...pre.slice(0, 1),
        ...pre.slice(1),
        {
          id: gid(),
          path: inputPath,
          bucketId: resp.data[0].id,
        } as ExtendedInfoItem,
      ]))
    } else {
      message.error(t('noBucketFound'))
    }

    setTimeout(() => {
      // 滚动到最右侧
      if (containerRef.current) {
        containerRef.current.scrollTo({
          left: containerRef.current.scrollWidth,
          behavior: 'smooth',
        })
      }
    })
  }, [t])

  const handleBlockClose = useCallback((id: string) => {
    setBlocks(pre => pre.filter(block => block.id !== id))
  }, [])

  const handleDeleteBucket = useCallback((id: number) => {
    return deleteBucket(id).then(() => {
      message.success(t('upload.deleteSuccess'))
      queryClient.invalidateQueries({ queryKey: ['bucket'] })
    })
  }, [deleteBucket, queryClient])

  const cachedBucket = useCachedBucket()
  const isDuplicate = useCallback((path: string) => {
    const data = _.get(cachedBucket, 'data.data', [])
    return data.filter((item: any) => item.path === path).length > 1
  }, [cachedBucket])

  return (
    <div ref={containerRef} className={clsx(className, 'block-previewer', 'flex', 'items-start', 'gap-4', 'overflow-x-auto', 'h-full relative')}>
      {
        blocks.map((block) => {
          return (
            <BucketBlockWrapper
              key={block.id}
              block={block}
              updateBlock={updateBlock}
              onClose={() => handleBlockClose(block.id)}
              pageSize={block.id === ROOT_BLOCK_ID ? pageSize : undefined}
              pageNo={block.id === ROOT_BLOCK_ID ? pageNo : undefined}
              style={{ width: `calc(100% / ${blocks.length})` }}
              onLinkClick={handleS3PathClick}
              renderBucketItem={block.id === ROOT_BLOCK_ID && !path ? (item) => {
                return (
                  <List.Item className={clsx(styles.listItem, "!flex !items-center")}>
                    <div className="flex items-center gap-2">
                      <div className="text-lg w-4 h-4">
                        <FileIcon path={item.fullPath} />
                      </div>
                      <Link className="hover:!underline" to="/" search={{ path: `${item.fullPath}`, id: item.id }}>{`${item.path}`}</Link>
                      {isDuplicate(item.fullPath) && <Tag color="blue"><KeyOutlined /> {item.keychain_name}</Tag>}
                    </div>
                    <div className="flex gap-2">
                      <Button type="text" size="small" icon={<EditOutlined />} onClick={() => bucketEditModalRef.current?.open(item.id!)} />
                      <Popconfirm title={t('bucketForm.deleteConfirm')} onConfirm={() => handleDeleteBucket(item.id!)} okText={t('ok')} cancelText={t('cancel')}>
                        <Button danger type="text" size="small" icon={<DeleteSvg />} />
                      </Popconfirm>
                    </div>
                  </List.Item>
                )
              } : undefined}
            />
          )
        })
      }
      <BucketEditModal modalRef={bucketEditModalRef} />
    </div>
  )
}

