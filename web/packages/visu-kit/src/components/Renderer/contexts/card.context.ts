import { createContext, useContext } from 'react'

export const RenderCardContext = createContext<{
  builtIns?: React.ReactNode
}>({
  builtIns: null,
})

export function useRenderCardContext() {
  const context = useContext(RenderCardContext)

  return context
}
