import type { BlockInfo, BucketBlockProps, BucketItem, BucketParams } from '@visu/kit'
import { BucketBlock, getBasename, getPathType } from '@visu/kit'
import clsx from 'clsx'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { EditOutlined } from '@ant-design/icons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import { Button, List, message, Modal, Popconfirm, Tag } from 'antd'
import { correctPath } from './Header'

import BucketIcon from '@/assets/bucket.svg?react'
import DeleteSvg from '@/assets/delete.svg?react'
import { useTranslation } from '@visu/i18n'
import { deleteBucket, digBucket, filterBucket } from '../../api/bucket'
import { ROOT_BLOCK_ID } from '../../constant'
import { download, gid } from '../../utils'
import BucketEditModal, { BucketEditModalRef } from '../BucketEditModal'

import styles from './index.module.css'

interface ExtendedInfoItem extends BlockInfo {
  bucketId: number
}

export interface BlockPreviewerProps {
  className?: string
}

export interface BucketBlockWrapperProps extends BucketBlockProps {
  pageSize?: number
  pageNo?: number
  block: ExtendedInfoItem
  updateBlock?: (id: string, values: Partial<ExtendedInfoItem>) => void
}

function BucketBlockWrapper({ block, onClose, pageSize: propPageSize = 50, pageNo: propPageNo = 1, updateBlock, ...props }: BucketBlockWrapperProps) {
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
    select: (data: any) => data.data as BucketItem[],
  }), [bucketQueryKey])

  const { data, isLoading } = useQuery(bucketQueryOptions)

  const handlePathCorrection = useCallback((path: string) => {
    if (id === ROOT_BLOCK_ID) {
      correctPath(path)
    }
  }, [id])

  const handleOnChange = useCallback((params: Partial<BucketParams>) => {
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
      pathType: getPathType(params.path ?? ''),
    })
  }, [id, search, updateBlock])
  
  const handleOpenInNewTab = useCallback((path: string) => {
    window.open(`${window.location.origin}${window.location.pathname}?path=${encodeURIComponent(path)}&pageSize=${pageSize}&pageNo=${pageNo}`, '_blank', 'noopener,noreferrer')
  }, [pageSize, pageNo, bucketId])

  const isRootBlock = id === ROOT_BLOCK_ID

  return (
    <BucketBlock
      block={block}
      loading={isLoading}
      dataSource={data}
      onClose={onClose}
      onPathCorrection={handlePathCorrection}
      onDownload={download}
      previewUrl="/api/v1/bucket/file_preview"
      showGoParent={!isRootBlock && !!path}
      showPagination={!isRootBlock && block.pathType === 'folder'}
      onChange={handleOnChange}
      closeable={!isRootBlock}
      onOpenInNewTab={handleOpenInNewTab}
      showOpenInNewTab={!isRootBlock}
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
    pathType,
    bucketId,
  }])

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

  useEffect(() => {
    const handleS3PathClick = async (e: any) => {
      const inputPath = e.detail.path

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
                <List.Item className={clsx(styles.listItem, "!flex !items-center")}>
                  <div className="flex items-center gap-2">
                    <BucketIcon />
                    <a href="javascript:void(0)" className="!hover:underline" onClick={() => {
                      setBlocks(pre => ([
                        ...pre.slice(0, 1),
                        ...pre.slice(1),
                        {
                          id: gid(),
                          path: item.path,
                          pathType: getPathType(item.path),
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
        return
      } else {
        setBlocks(pre => ([
          ...pre.slice(0, 1),
          ...pre.slice(1),
          {
            id: gid(),
            path: inputPath,
            pathType: getPathType(inputPath),
            bucketId: resp.data[0].id,
          } as ExtendedInfoItem,
        ]))
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
    }
    // 监听s3-path-click事件
    document.addEventListener('s3-path-click', handleS3PathClick)

    return () => {
      document.removeEventListener('s3-path-click', handleS3PathClick)
    }
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

  // s3://llm-users-phdd2/jinzhenj2/demo_data_output/part-675bf9ba2e22-000000.jsonl

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
              renderBucketItem={block.id === ROOT_BLOCK_ID ? (item) => {
                return (
                  <List.Item className={clsx(styles.listItem, "!flex !items-center")}>
                    <div className="flex items-center gap-2">
                      <BucketIcon />
                      <Link className="!hover:underline" to="/" search={{ path: `${item.path}/`, id: item.id }}>{`${item.path}/`}</Link>
                      {item.name && <Tag>{item.name}</Tag>}
                    </div>
                    <div className="flex gap-2">
                      <Button type="text" size="small" icon={<EditOutlined />} onClick={() => bucketEditModalRef.current?.open(item.id)} />
                      <Popconfirm title={t('bucketForm.deleteConfirm')} onConfirm={() => handleDeleteBucket(item.id)}>
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

