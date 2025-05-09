import { LeftOutlined, RightOutlined } from '@ant-design/icons'
import styled from '@emotion/styled'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from '@visu/i18n'
import { Button, Drawer, Input, Space, Tooltip } from 'antd'
import { useCallback, useEffect, useState } from 'react'
import { useTheme } from '../../theme'

import axios from 'axios'
import { bucketKey } from '../../queries/bucket.key'
import BucketList, { BucketItemWrapper } from './BucketList'
import { formatBucketList, useBucketContext } from './context'

export interface FileListDrawerProps {
  path: string
}

const PageInput = styled(Input)`
  width: 60px;
  text-align: center;
`

export default function FileListDrawer({ path = '' }: FileListDrawerProps) {
  const { tokens } = useTheme();
  const [openDrawer, setOpenDrawer] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const { pageSize, bucketUrl } = useBucketContext()
  const parentPath = path.split('/').slice(0, -1).join('/')
  const queryClient = useQueryClient()
  const { t } = useTranslation()
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
  }, [parentPath, queryClient, bucketUrl])

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
      title={t('bucket.fileDirectory')}
      width="50%"
      open={openDrawer}
      onClose={() => {
        setOpenDrawer(false)
      }}
      extra={(
        <Space.Compact>
          <Tooltip title={t('bucket.previousPage')}>
            <Button
              disabled={currentPage === 1}
              onClick={() => {
                setCurrentPage(currentPage - 1)
                fetchBucketList(currentPage - 1)
              }}
              icon={<LeftOutlined />}
            />
          </Tooltip>
          <PageInput min={1} readOnly value={currentPage} />
          <Tooltip title={t('bucket.nextPage')}>
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
