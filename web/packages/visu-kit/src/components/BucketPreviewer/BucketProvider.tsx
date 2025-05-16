import { useMemo } from 'react'

import { BucketItem, BucketParams } from '../../types'
import { BucketContext, BucketQueryOptions } from './context'
// import FileListOverlay from './FileListOverlay'

export interface BucketProviderProps extends React.PropsWithChildren {
  // s3文件路径
  url: string
  bucketQueryOptions: BucketQueryOptions
  onParamsChange?: (params: Partial<BucketParams>) => void
  downloadUrl: string
  previewUrl: string
  renderBucketItem?: (item: BucketItem) => React.ReactNode
}

export default function BucketPreviewer({
  url,
  children,
  bucketQueryOptions,
  downloadUrl,
  previewUrl,
  renderBucketItem,
  onParamsChange,
}: BucketProviderProps) {

  const contextValue = useMemo(() => ({
    path: url,
    bucketQueryOptions,
    downloadUrl,
    previewUrl,
    renderBucketItem,
    onParamsChange,
  }), [url, bucketQueryOptions, downloadUrl, previewUrl, renderBucketItem, onParamsChange])

  return (
    <BucketContext.Provider value={contextValue}>
      {children}
    </BucketContext.Provider>
  )
}
