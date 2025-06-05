import { createContext, useContext } from 'react'
import { BaseBucketType } from './types'

export interface RenderBlockContextType<BucketType extends BaseBucketType> {
  id: string
  path: string
  pathType: string
  basename?: string
  data?: BucketType
  nextable?: boolean
  onNext?: () => void
  prevable?: boolean
  onPrev?: () => void
  onClose?: () => void
  goParent: () => void
  dataSource?: BucketType | BucketType[]
  onDownload?: (path: string) => void
  renderBucketItem?: (item: BucketType) => React.ReactNode
  previewUrl?: string
  onLinkClick?: (path: string) => void
  onKeyClick?: (path: string, value: string) => void
}

export const PreviewBlockContext = createContext<RenderBlockContextType<BaseBucketType>>({} as RenderBlockContextType<BaseBucketType>)

export function usePreviewBlockContext<T extends BaseBucketType>() {
  const context = useContext(PreviewBlockContext) as unknown as RenderBlockContextType<T>
  if (!context) {
    throw new Error('usePreviewBlockContext must be used within a PreviewBlockProvider')
  }

  return context
}
