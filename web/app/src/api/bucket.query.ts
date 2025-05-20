import { useMutation, useQuery } from '@tanstack/react-query';
import type { BatchBucketCreateBody, BucketUpdateBody } from './bucket';
import { createBatchBucket, deleteBucket, getBucket, updateBucket } from './bucket';

export function useBucket(id?: number | null) {
  return useQuery({
    enabled: typeof id === 'number',
    queryKey: ['bucket', id],
    queryFn: () => getBucket(id!),
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
