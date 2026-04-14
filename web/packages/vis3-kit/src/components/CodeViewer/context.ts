import { createContext, useContext } from 'react'

import type { KeyPath } from './json-key-plugin'

export const CodeViewerContext = createContext<{
  wrap: boolean
  value?: string | null
  onChange: (value: string) => void
  onJsonKeyClick?: (detail: { field: string, pathArray: KeyPath }) => void
  openJsonPreview?: (absolutePathArray: KeyPath) => void
  jsonBasePath?: KeyPath
}>({
      wrap: false,
      value: undefined,
      onChange: () => { },
      onJsonKeyClick: undefined,
      openJsonPreview: undefined,
      jsonBasePath: undefined,
    })

export function useCodeViewerContext() {
  const context = useContext(CodeViewerContext)
  if (!context) {
    throw new Error('useCodeViewerContext must be used within a CodeViewerContext.Provider')
  }

  return context
}
