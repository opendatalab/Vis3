import { createContext, useContext } from 'react'

import type { PathType } from '../../../components/Renderer/utils'
import type { BucketItem } from '../../../types'

export interface RenderBlockContextType {
  id: string
  path: string
  pathType: PathType
  basename?: string
  data?: BucketItem
  nextable?: boolean
  onNext?: () => void
  prevable?: boolean
  onPrev?: () => void
  onClose?: () => void
  goParent: () => void
  dataSource?: BucketItem
}

export const PreviewBlockContext = createContext<RenderBlockContextType>({} as RenderBlockContextType)

export function usePreviewBlockContext() {
  const context = useContext(PreviewBlockContext)
  if (!context) {
    throw new Error('usePreviewBlockContext must be used within a PreviewBlockProvider')
  }

  return context
}
