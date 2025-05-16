import { useQuery } from '@tanstack/react-query'
import { createContext, useContext } from 'react'
import { BucketItem, BucketParams } from '../../types'

export type BucketQueryOptions = Parameters<typeof useQuery>[0]

export const BucketContext = createContext<{
  path: string
  onParamsChange?: (params: Partial<BucketParams>) => void
  downloadUrl: string
  previewUrl: string
  // useQuery options
  bucketQueryOptions: BucketQueryOptions,
  renderBucketItem?: (item: BucketItem) => React.ReactNode
}>({
  path: '',
  onParamsChange: () => {
    console.warn('no implement')
  },
  downloadUrl: '',
  previewUrl: '',
  bucketQueryOptions: {
    queryKey: ['bucket'],
    queryFn: () => {
      return []
    },
  },
  renderBucketItem: () => null,
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
