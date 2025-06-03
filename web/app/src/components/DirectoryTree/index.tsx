import { BucketItem, FileIcon } from "@visu/kit";
import { Button, Skeleton, Tooltip, Tree, TreeDataNode } from "antd";
import { createContext, MutableRefObject, useCallback, useContext, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import styles from './index.module.css';

import ArrowFromLeftSvg from '@/assets/arrow-from-left.svg?react';
import ArrowFromRightSvg from '@/assets/arrow-from-right.svg?react';
import FolderIcon from '@/assets/folder.svg?react';
import { ArrowDownOutlined } from "@ant-design/icons";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "@visu/i18n";
import clsx from "clsx";
import _ from "lodash";
import { digBucket } from "../../api/bucket";

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
  data: BucketItem[]
  pageNo: number
}

export default function DirectoryTree({ treeRef, className }: DirectoryTreeProps) {
  const [treeDataMap, setTreeDataMap] = useState<Record<string, TreeMapItem>>({})
  const openedRef = useRef<boolean>(false)
  const location = useLocation()
  const search = location.search as Record<string, string>
  const path = search.path as string || ''
  const pathWithoutQuery = path?.split('?')[0]
  const [selectedKeys, setSelectedKeys] = useState<string[]>([pathWithoutQuery])
  const [expandedKeys, setExpandedKeys] = useState<string[]>([path])
  const { open, setOpen } = useTreeContext()
  const [loading, setLoading] = useState(false)
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const pageSize = Number(search.page_size) || 50
  const { t } = useTranslation()

  const getBucketQueryKey = useCallback((_path?: string, pageNo?: number) => {
    if (!_path) {
      return ['bucket']
    }

    return ['bucket', {
      path: _path,
      pageNo: pageNo ?? _.get(treeDataMap, [_path, 'pageNo'], 1),
      pageSize,
      id: search.id,
    }]
  }, [treeDataMap, search.id])

  useEffect(() => {
    setSelectedKeys([pathWithoutQuery])
  }, [pathWithoutQuery])

  useEffect(() => {
    const fragments = extractPath(path).slice(0, -1)
    if (path) {
      setExpandedKeys(fragments.map(fragment => fragment.fullPath))
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
      queryClient.fetchQuery({ queryKey: getBucketQueryKey(), staleTime: 10000, queryFn: () => digBucket({ path: '/', id: Number(search.id) }) }),
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
          data: item.data as BucketItem[],
          pageNo: item.page_no ?? 1,
        }
      } else {
        acc[fragments[index - 1].fullPath] = {
          total: item.total ?? 0,
          data: item.data as BucketItem[],
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
    async (type: string, _path: string) => {
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

      const response = await queryClient.fetchQuery({ queryKey: getBucketQueryKey(fullPath), staleTime: 10000, queryFn: () => digBucket({ path: fullPath, id: Number(search.id) }) })

      setTreeDataMap((pre) => {
        if (pre[fullPath]) {
          return pre
        }

        return {
          ...pre,
          [fullPath]: {
            total: response.total ?? 0,
            data: response.data as BucketItem[],
            pageNo: response.page_no ?? 1,
          },
        }
      })
    },
    [path],
  )

  const handleSelect = useCallback(
    async (key: string) => {
      if (key.endsWith('///load-more')) {
        const _path = key.replace('///load-more', '')
        const pageNo = _.get(treeDataMap, [_path, 'pageNo'], 1) + 1

        const response = await queryClient.fetchQuery({ queryKey: getBucketQueryKey(_path, pageNo), staleTime: 10000, queryFn: () => digBucket({ path: _path, id: Number(search.id), pageNo }) })

        setTreeDataMap((pre) => {
          const exist = pre[_path]

          return {
            ...pre,
            [_path]: {
              total: response.total + (exist?.total ?? 0),
              data: [...exist?.data ?? [], ...response.data as BucketItem[]],
              pageNo,
            },
          }
        })
        return
      }

      navigate({
        to: '/',
        search: {
          ...search,
          path: key,
        },
      })
    },
    [search, treeDataMap],
  )

  const onLoadData = useCallback(
    (node: TreeDataNode) => {
      if (treeDataMap[node.key as string]) {
        return Promise.resolve()
      }

      return handleDig(_.get(node, 'raw.type') as unknown as string, node.key as string)
    },
    [handleDig, treeDataMap],
  )

  const treeData = useMemo(() => {
    const convertTree = (rootMap: BucketItem[], depth: number = 0, parentPath = ''): TreeDataNode[] => {
      return _.map(rootMap, (item) => {
        const _path = item.path.replace(parentPath, '').replace(/\/$/, '')
        const loadMore = {
          title: <span className="whitespace-nowrap">{t('directoryTree.loadMore')}</span>,
          key: `${item.path}///load-more`,
          isLeaf: true,
          icon: <ArrowDownOutlined />,
          raw: item,
        }

        const children = convertTree(treeDataMap[item.path]?.data || [], depth + 1, item.path)

        if (treeDataMap[item.path]?.total % pageSize === 0 && treeDataMap[item.path]?.total > 0) {
          children.push(loadMore)
        }

        return {
          title: <span className="whitespace-nowrap">{_path}</span>,
          key: `${item.path}`,
          children,
          isLeaf: item.type === 'file',
          icon: <div className="text-lg w-4 h-4">{item.path.endsWith('/') ? <FileIcon  type="folder" /> : <FileIcon path={item.path} />}</div>,
          raw: item,
        }
      })
    }

    return convertTree(treeDataMap['s3://']?.data || [], 0, 's3://')
  }, [path, treeDataMap])

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
        onSelect={(_keys, { node }) => handleSelect(node.key as string)}
        treeData={treeData}
      />
    </div>
  )
}