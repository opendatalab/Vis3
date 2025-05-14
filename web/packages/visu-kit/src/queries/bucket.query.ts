import { useQuery } from '@tanstack/react-query'

export function useBuckets(queryOptions: Parameters<typeof useQuery>[0]) {
  return useQuery(queryOptions)
}
