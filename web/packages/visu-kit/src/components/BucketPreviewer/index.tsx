import { useCallback, useEffect, useMemo, useState } from 'react'

import { QueryProvider } from '../../queries/queryClient'
import { BucketParams } from '../../types'
import ErrorBoundary from '../ErrorBoundary'
import FilePreviewer from '../FilePreviewer'
import { PAGENATION_CHANGE_EVENT } from '../Renderer/Block'
import { BucketContext } from './context'
import FileListOverlay from './FileListOverlay'
import BucketHeader from './Header'

export interface BucketPreviewerProps {
  // s3文件路径
  url: string
  onParamsChange: (params: BucketParams) => void
  pageSize: number
  pageNo: number
  bucketUrl: string
  downloadUrl: string
  previewUrl: string
  mimeTypeUrl: string
}

export default function BucketPreviewer({ url, onParamsChange, pageSize: propsPageSize, pageNo: propsPageNo, bucketUrl, downloadUrl, previewUrl, mimeTypeUrl }: BucketPreviewerProps) {
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

  useEffect(() => {
    const handlePagenationChange = (e: CustomEvent) => {
      const { pageNo, pageSize } = e.detail
      const params = {
        pageNo,
      } as BucketParams

      if (pageSize) {
        params.pageSize = pageSize
      }

      onParamsChange?.(params)
    }

    document.addEventListener(PAGENATION_CHANGE_EVENT, handlePagenationChange as EventListener)

    return () => {
      document.removeEventListener(PAGENATION_CHANGE_EVENT, handlePagenationChange as EventListener)
    }
  }, [onParamsChange])

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
    bucketUrl,
    downloadUrl,
    previewUrl,
    mimeTypeUrl,  
  }), [currentPath, url, total, pageSize, pageNo, handleOnParamsChange, bucketUrl, downloadUrl, previewUrl, mimeTypeUrl])

  console.log('contextValue', contextValue)
  console.log('url', url)

  return (
    <QueryProvider>
      <ErrorBoundary>
        <BucketContext.Provider value={contextValue}>
          <div id="bucketContainer" className="flex flex-col flex-1 gap-4 py-6 max-h-screen relative">
            <BucketHeader />
            <div className="flex flex-col gap-2 h-[calc(100%-3rem)] px-6 flex-1 min-h-0">
              <FilePreviewer />
              <FileListOverlay path={url} />
            </div>
          </div>
        </BucketContext.Provider>
      </ErrorBoundary>
    </QueryProvider>
  )
}
