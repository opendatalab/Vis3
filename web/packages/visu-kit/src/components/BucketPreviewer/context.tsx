import { createContext, useContext } from 'react'
import { BucketItem, BucketParams } from '../../types'


export const BucketContext = createContext<{
  pageSize: number
  pageNo: number
  path: string
  onParamsChange: (params: BucketParams) => void
  total: number
  setTotal: (value: number) => void
  bucketUrl: string
  downloadUrl: string
  previewUrl: string
  mimeTypeUrl: string
}>({
  pageSize: 50,
  pageNo: 1,
  path: '',
  onParamsChange: () => {
    console.warn('no implement')
  },
  total: 0,
  setTotal: () => {
    console.warn('no implement')
  },
  bucketUrl: '',
  downloadUrl: '',
  previewUrl: '',
  mimeTypeUrl: '',
})

export function formatBucketList(bucketList: BucketItem[], parentPath: string) {
  return bucketList.map(item => ({
    ...item,
    path: item.path.replace(parentPath, '').replace(/\/$/, ''),
    fullPath: item.path,
  }))
}

export function useBucketContext() {
  const context = useContext(BucketContext)

  if (!context) {
    throw new Error('useBucketContext must be used within a BucketProvider')
  }

  return context
}
