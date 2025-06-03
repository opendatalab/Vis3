import { createContext, useContext } from 'react'

import type { BucketItem } from '../../../types'

export interface RenderBlockContextType {
  id: string
  path: string
  pathType: string
  basename?: string
  data?: BucketItem
  nextable?: boolean
  onNext?: () => void
  prevable?: boolean
  onPrev?: () => void
  onClose?: () => void
  goParent: () => void
  dataSource?: BucketItem | BucketItem[]
  onDownload?: (path: string) => void
  renderBucketItem?: (item: BucketItem) => React.ReactNode
  previewUrl?: string
}

export const PreviewBlockContext = createContext<RenderBlockContextType>({} as RenderBlockContextType)

export function usePreviewBlockContext() {
  const context = useContext(PreviewBlockContext)
  if (!context) {
    throw new Error('usePreviewBlockContext must be used within a PreviewBlockProvider')
  }

  return context
}
