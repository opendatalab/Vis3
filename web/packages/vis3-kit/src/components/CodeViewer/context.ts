import { createContext, useContext } from 'react'

export const CodeViewerContext = createContext<{
  wrap: boolean
  value: string
  onChange: (value: string) => void
}>({
      wrap: false,
      value: '',
      onChange: () => { },
    })

export function useCodeViewerContext() {
  const context = useContext(CodeViewerContext)
  if (!context) {
    throw new Error('useCodeViewerContext must be used within a CodeViewerContext.Provider')
  }

  return context
}
