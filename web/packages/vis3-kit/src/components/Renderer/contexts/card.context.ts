import { createContext, useContext } from 'react'

export const RenderCardContext = createContext<{
  renderer?: React.ReactNode
}>({
  renderer: null,
})

export function useRenderCardContext() {
  const context = useContext(RenderCardContext)

  return context
}
