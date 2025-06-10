import { useIsFetching, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation } from '@tanstack/react-router';
import { useMemo } from 'react';
import type { BatchBucketCreateBody, BucketCreateBody, BucketUpdateBody } from './bucket';
import { createBatchBucket, createBucket, deleteBucket, filterBucket, getBucket, updateBucket } from './bucket';

export function useBucket(id?: number | null) {
  return useQuery({
    enabled: typeof id === 'number',
    queryKey: ['bucket', id],
    queryFn: () => getBucket(id!),
  })
}

export function useFilterBucket(path: string) {
  return useQuery({
    queryKey: ['bucket', 'filter', path],
    queryFn: () => filterBucket(path),
  })
}

export function useCreateBucket() {
  return useMutation({
    mutationFn: (body: BucketCreateBody) => createBucket(body),
  })
}

export function useBatchCreateBucket() {
  return useMutation({
    mutationFn: (body: BatchBucketCreateBody[]) => createBatchBucket(body),
  })
}

export function useDeleteBucket() {
  return useMutation({
    mutationFn: (id: number) => deleteBucket(id),
  })
}

export function useUpdateBucket() {
  return useMutation({
    mutationFn: ({ id, body }: { id: number, body: BucketUpdateBody }) => updateBucket(id, body),
  })
}

export function useBucketQueryKey() {
  const location = useLocation()
  const search = location.search as Record<string, string | number>
  const path = search.path as string || ''
  const pageNo = Number(search.page_no) || 1
  const pageSize = Number(search.page_size) || 50
  const bucketId = Number(search.id) || 0
  const key = useMemo(() => {
    if (path) {
      return ['bucket', {
        path,
        pageSize,
        pageNo,
        id: bucketId,
      }]
    }

    return ['bucket']
  }, [path, pageSize, pageNo, bucketId])

  return [key, path, pageNo, pageSize, bucketId] as const
}

export function useCachedBucket() {
  const [queryKey] = useBucketQueryKey()
  const queryClient = useQueryClient()

  const isFetching = useIsFetching({ queryKey })

  return {
    ...queryClient.getQueryState(queryKey as any),
    fetchingCount: isFetching,
  }
}