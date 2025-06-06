import { createContext, useContext } from 'react'

export const FieldContext = createContext<{
  value?: any
  path?: string
}>({
  value: undefined,
  path: undefined,
})

export function useFieldContext() {
  const context = useContext(FieldContext)

  if (!context) {
    throw new Error('useFieldContext must be used within a FieldContext')
  }

  return context
}
