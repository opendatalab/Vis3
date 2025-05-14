import styled from '@emotion/styled'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTheme } from '../../theme'

import { QueryProvider } from '../../queries/queryClient'
import { BucketParams } from '../../types'
import FilePreviewer from '../FilePreviewer'
import { BucketContext, BucketQueryOptions } from './context'
// import FileListOverlay from './FileListOverlay'
import BucketHeader from './Header'

export interface BucketPreviewerProps {
  // s3文件路径
  url: string
  onParamsChange: (params: BucketParams) => void
  pageSize: number
  pageNo: number
  bucketQueryOptions: BucketQueryOptions
  downloadUrl: string
  previewUrl: string
  offsetTop?: number
}

const BucketContainer = styled.div<{ $offsetTop?: number }>`
  display: flex;
  flex-direction: column;
  flex: 1;
  gap: 1rem;
  position: relative;
  ${({ $offsetTop }) => $offsetTop && `
    max-height: calc(100vh - ${$offsetTop}px);
  `}
`

const ContentContainer = styled.div<{ $offsetTop?: number }>`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-height: 0;
  height: 100vh;
`

export default function BucketPreviewer({ url, onParamsChange, pageSize: propsPageSize, pageNo: propsPageNo, bucketQueryOptions, downloadUrl, previewUrl, offsetTop }: BucketPreviewerProps) {
  const { tokens } = useTheme();
  const [total, setTotal] = useState(0)
  const [pageNo, setPageNo] = useState(propsPageNo || 1)
  const [pageSize, setPageSize] = useState(propsPageSize || 50)
  const [currentPath, setCurrentPath] = useState<string>()

  useEffect(() => {
    setPageNo(propsPageNo || 1)
  }, [propsPageNo])

  useEffect(() => {
    setPageSize(propsPageSize || 50)
  }, [propsPageSize])

  useEffect(() => {
    setCurrentPath(url)
  }, [url])

  const handleOnParamsChange = useCallback((params: Partial<BucketParams>) => {
    if (params.pageNo) {
      setPageNo(params.pageNo)
    }

    if (params.pageSize) {
      setPageSize(params.pageSize)
    }

    if (typeof params.path === 'string') {
      setCurrentPath(params.path)
    }

    onParamsChange?.(params)
  }, [onParamsChange])

  const contextValue = useMemo(() => ({
    path: currentPath ?? url,
    total,
    pageSize,
    pageNo,
    onParamsChange: handleOnParamsChange,
    setTotal,
    bucketQueryOptions,
    downloadUrl,
    previewUrl,  
  }), [currentPath, url, total, pageSize, pageNo, handleOnParamsChange, bucketQueryOptions, downloadUrl, previewUrl])

  return (
    <QueryProvider>
      <BucketContext.Provider value={contextValue}>
        <BucketContainer id="bucketContainer" $offsetTop={offsetTop}>
          <BucketHeader />
          <ContentContainer>
            <FilePreviewer />
          </ContentContainer>
        </BucketContainer>
      </BucketContext.Provider>
    </QueryProvider>
  )
}
