import { FileIcon } from "@vis3/kit";
import { Button, Skeleton, Tooltip, Tree, TreeDataNode } from "antd";
import { createContext, MutableRefObject, useCallback, useContext, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import styles from './index.module.css';

import ArrowFromLeftSvg from '@/assets/arrow-from-left.svg?react';
import ArrowFromRightSvg from '@/assets/arrow-from-right.svg?react';
import FolderIcon from '@/assets/folder.svg?react';
import { ArrowDownOutlined, LoadingOutlined } from "@ant-design/icons";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "@vis3/i18n";
import clsx from "clsx";
import _ from "lodash";
import { BucketData, digBucket } from "../../api/bucket";

export interface TreeRef {
  toggle: (open: boolean) => void
}

export interface DirectoryTreeProps {
  treeRef?: MutableRefObject<TreeRef | null>
  className?: string
}

function extractPath(path: string) {
  const _fragments = path.replace(/^s3:\/\//, '').split('/')
  return _fragments
    .map((fragment, index) => {
      const prefix = _fragments.slice(0, index + 1).join('/')
      return {
        fragment,
        path: prefix,
        fullPath: `s3://${prefix}/`,
      }
    })
}

export function DirectoryTreeTrigger() {
  const { open, setOpen } = useTreeContext()
  const { t } = useTranslation()

  const handleToggle = useCallback(() => {
    document.dispatchEvent(new CustomEvent('toggleDirectoryTree', { detail: { open: !open } }))
  }, [open, setOpen])

  return (
    <Tooltip title={open ? t('directoryTree.hide') : t('directoryTree.show')} placement="bottomLeft"><Button icon={open ? <ArrowFromRightSvg /> : <ArrowFromLeftSvg />} onClick={handleToggle} /></Tooltip>
  )
}

const TreeContext = createContext<{
  open: boolean
  setOpen: (open: boolean) => void
}>({
  open: false,
  setOpen: () => {},
})

export function useTreeContext() {
  const context = useContext(TreeContext)

  if (!context) {
    throw new Error('useTreeContext must be used within a DirectoryTreeProvider')
  }

  return context
}

export function DirectoryTreeProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)

  const value = useMemo(() => ({
    open,
    setOpen,
  }), [open])

  return <TreeContext.Provider value={value}>
    {children}
  </TreeContext.Provider>
}

interface TreeMapItem {
  total: number
  data: BucketData[]
  pageNo: number
}

export default function DirectoryTree({ treeRef, className }: DirectoryTreeProps) {
  const [treeDataMap, setTreeDataMap] = useState<Record<string, TreeMapItem>>({})
  const openedRef = useRef<boolean>(false)
  const location = useLocation()
  const search = location.search as Record<string, string>
  const path = search.path as string || ''
  const pathWithoutQuery = path?.split('?')[0]
  const [selectedKeys, setSelectedKeys] = useState<string[]>([`${search.id}-${pathWithoutQuery}`])
  const [expandedKeys, setExpandedKeys] = useState<string[]>([path])
  const { open, setOpen } = useTreeContext()
  const [loading, setLoading] = useState(false)
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const pageSize = Number(search.page_size) || 50
  const { t } = useTranslation()
  const [treeLoading, setTreeLoading] = useState(false)

  const getBucketQueryKey = useCallback((_path?: string, pageNo?: number, bucketId?: number) => {
    if (!_path) {
      return ['bucket']
    }

    return ['bucket', {
      path: _path,
      pageNo: pageNo ?? _.get(treeDataMap, [_path, 'pageNo'], 1),
      pageSize,
      id: bucketId ?? search.id,
    }]
  }, [treeDataMap, search.id])

  useEffect(() => {
    setSelectedKeys([`${search.id}-${pathWithoutQuery}`])
  }, [pathWithoutQuery])

  useEffect(() => {
    const fragments = extractPath(path).slice(0, -1)
    if (path) {
      setExpandedKeys(fragments.map(fragment => `${search.id}-${fragment.fullPath}`))
    }
  }, [path])

  const handleToggle = useCallback(async (_open: boolean) => {
    setOpen(_open)

    if (openedRef.current) {
      return
    }

    openedRef.current = true

    const fragments = extractPath(path).slice(0, -1)
    setLoading(true)
    const responses = await Promise.all([
      queryClient.fetchQuery({ queryKey: getBucketQueryKey(), staleTime: 10000, queryFn: () => digBucket({ path: '/' }) }),
      ...fragments.map(fragment => 
        queryClient.fetchQuery({ queryKey: getBucketQueryKey(fragment.fullPath), staleTime: 10000, queryFn: () => digBucket({ path: fragment.fullPath, id: Number(search.id) }) })
      )
    ])
    .finally(() => {
      setLoading(false)
    })
    const _treeDataMap = responses.reduce((acc: Record<string, TreeMapItem>, item, index) => {
      if (index === 0) {
        acc['s3://'] = {
          total: item.total ?? 0,
          data: item.data as BucketData[],
          pageNo: item.page_no ?? 1,
        }
      } else {
        acc[`${item.data[0].id}-${fragments[index - 1].fullPath}`] = {
          total: item.total ?? 0,
          data: item.data as BucketData[],
          pageNo: item.page_no ?? 1,
        }
      }
      return acc
    }, {})

    setTreeDataMap(_treeDataMap)
  }, [path, search.id])

  useEffect(() => {
    const handleToggleDirectoryTree = (e: CustomEvent) => {
      handleToggle(e.detail.open)
    }

    document.addEventListener('toggleDirectoryTree', handleToggleDirectoryTree as EventListener)

    return () => {
      document.removeEventListener('toggleDirectoryTree', handleToggleDirectoryTree as EventListener)
    }
  }, [handleToggle])

  useImperativeHandle(treeRef, () => ({
    toggle: handleToggle,
  }))

  const handleDig = useCallback(
    async (type: string, _path: string, bucketId: number) => {
      let fullPath = _path

      if (type === 'file') {
        return
      }
      // 1. abc
      if (!_path.startsWith('s3://')) {
        fullPath = `${path}${_path}`
      }

      // 2. s3://abc => s3://abc/
      if (['bucket', 'dir'].includes(type) && !fullPath.endsWith('/')) {
        fullPath = `${fullPath}/`
      }

      const response = await queryClient.fetchQuery({ queryKey: getBucketQueryKey(fullPath, bucketId), staleTime: 10000, queryFn: () => digBucket({ path: fullPath, id: bucketId }) })

      setTreeDataMap((pre) => {
        const key = `${bucketId}-${fullPath}`
        if (pre[key]) {
          return pre
        }

        return {
          ...pre,
          [key]: {
            total: response.total ?? 0,
            data: response.data as BucketData[],
            pageNo: response.page_no ?? 1,
          },
        }
      })
    },
    [path],
  )

  const handleSelect = useCallback(
    async ({ key, raw }: { key: string, raw: BucketData }) => {
      if (key.endsWith('///load-more')) {
        if (treeLoading) {
          return
        }
        
        const _key = `${raw.id}-${raw.path}`
        const pageNo = _.get(treeDataMap, [_key, 'pageNo'], 1) + 1
        setTreeLoading(true)
        const response = await queryClient.fetchQuery({ queryKey: getBucketQueryKey(raw.path, pageNo), staleTime: 10000, queryFn: () => digBucket({ path: raw.path, id: raw.id, pageNo }) })

        setTreeDataMap((pre) => {
          const exist = pre[_key]

          return {
            ...pre,
            [_key]: {
              total: response.total + (exist?.total ?? 0),
              data: [...exist?.data ?? [], ...response.data as BucketData[]],
              pageNo,
            },
          }
        })
        setTreeLoading(false)
        return
      }

      navigate({
        to: '/',
        search: {
          ...search,
          path: raw.path,
          id: raw.id,
        },
      })
    },
    [search, treeDataMap, treeLoading],
  )

  const onLoadData = useCallback(
    (node: TreeDataNode) => {
      const path = (node as any).raw.path
      const key = `${(node as any).raw.id}-${path}`

      if (treeDataMap[key]) {
        return Promise.resolve()
      }

      return handleDig(_.get(node, 'raw.type') as unknown as string, path, (node as any).raw.id)
    },
    [handleDig, treeDataMap],
  )

  const treeData = useMemo(() => {
    const convertTree = (rootMap: BucketData[], depth: number = 0, parentPath = ''): TreeDataNode[] => {
      return _.map(rootMap, (item) => {
        const _path = item.path.replace(parentPath, '').replace(/\/$/, '')
        const key = `${item.id}-${item.path}`
        const loadMore = {
          title: <span className="whitespace-nowrap">{t('directoryTree.loadMore')}</span>,
          key: `${key}///load-more`,
          isLeaf: true,
          icon: treeLoading ? <LoadingOutlined spin /> : <ArrowDownOutlined />,
          raw: item,
        }

        const children = convertTree(treeDataMap[key]?.data || [], depth + 1, item.path)

        if (treeDataMap[key]?.total % pageSize === 0 && treeDataMap[key]?.total > 0) {
          children.push(loadMore)
        }

        return {
          title: <span className="whitespace-nowrap">{_path}</span>,
          key,
          children,
          isLeaf: item.type === 'file',
          icon: <div className="text-lg w-4 h-4">{item.path.endsWith('/') ? <FileIcon  type="folder" /> : <FileIcon path={item.path} />}</div>,
          raw: item,
        }
      })
    }

    return convertTree(treeDataMap['s3://']?.data || [], 0, 's3://')
  }, [path, treeDataMap, treeLoading])

  if (loading) {
    return <Skeleton className={styles.tree} active />
  }

  return (
    <div className={clsx(styles.tree, className, {
      hidden: !open || !path,
    })}>
      <Tree.DirectoryTree
        expandedKeys={expandedKeys}
        onExpand={_expandedKeys => setExpandedKeys(_expandedKeys as string[])}
        loadData={onLoadData}
        icon={<FolderIcon className="text-lg" />}
        blockNode
        selectedKeys={selectedKeys}
        onSelect={(_keys, { node }) => handleSelect(node as any)}
        treeData={treeData}
      />
    </div>
  )
}