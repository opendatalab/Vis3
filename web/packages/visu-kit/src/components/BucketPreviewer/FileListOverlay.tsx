import { LeftOutlined, RightOutlined } from '@ant-design/icons'
import { useQueryClient } from '@tanstack/react-query'
import { Button, Drawer, Input, Space, Tooltip } from 'antd'
import { useCallback, useEffect, useState } from 'react'

import axios from 'axios'
import { bucketKey } from '../../queries/bucket.key'
import BucketList, { BucketItemWrapper } from './BucketList'
import { formatBucketList, useBucketContext } from './context'

export interface FileListDrawerProps {
  path: string
}

export default function FileListDrawer({ path = '' }: FileListDrawerProps) {
  const [openDrawer, setOpenDrawer] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const { pageSize, bucketUrl } = useBucketContext()
  const parentPath = path.split('/').slice(0, -1).join('/')
  const queryClient = useQueryClient()
  const [bucketList, setBucketList] = useState<BucketItemWrapper[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchBucketList = useCallback((page: number) => {
    const newParams = {
      pageNo: page,
      path: `${parentPath}/`,
    }

    setIsLoading(true)

    queryClient.fetchQuery({
      staleTime: 10000,
      queryKey: bucketKey.list(newParams),
      queryFn: () => axios.get(bucketUrl, { params: newParams }),
    }).then((res) => {
      setBucketList(formatBucketList(res.data, `${parentPath}/`))
    }).finally(() => {
      setIsLoading(false)
    })
  }, [parentPath, queryClient])

  useEffect(() => {
    const handleOpenDrawer = () => {
      setOpenDrawer(true)
      fetchBucketList(currentPage)
    }

    const handleCloseDrawer = () => {
      setOpenDrawer(false)
    }

    document.addEventListener('open-bucket-list', handleOpenDrawer)
    document.addEventListener('close-bucket-list', handleCloseDrawer)

    return () => {
      document.removeEventListener('open-bucket-list', handleOpenDrawer)
      document.removeEventListener('close-bucket-list', handleCloseDrawer)
    }
  }, [fetchBucketList, currentPage])

  return (
    <Drawer
      loading={isLoading}
      title="文件目录"
      width="50%"
      open={openDrawer}
      onClose={() => {
        setOpenDrawer(false)
      }}
      extra={(
        <Space.Compact>
          <Tooltip title="上一页">
            <Button
              disabled={currentPage === 1}
              onClick={() => {
                setCurrentPage(currentPage - 1)
                fetchBucketList(currentPage - 1)
              }}
              icon={<LeftOutlined />}
            />
          </Tooltip>
          <Input className="w-[60px] text-center" min={1} readOnly value={currentPage} />
          <Tooltip title="下一页">
            <Button
              disabled={isLoading || bucketList.length < Number(pageSize)}
              onClick={() => {
                setCurrentPage(currentPage + 1)
                fetchBucketList(currentPage + 1)
              }}
              icon={<RightOutlined />}
            />
          </Tooltip>
        </Space.Compact>
      )}
    >
      <BucketList
        highlightCurrent
        hideRight
        objects={bucketList}
        pathWithoutQuery={path}
      />

    </Drawer>
  )
}
