import { useMutation, useQuery } from "@tanstack/react-query"
import { BatchBucketCreateBody, createBatchBucket, deleteBucket, getBucket } from "./bucket"

export const useBucket = (id: number) => {
  return useQuery({
    queryKey: ['bucket', id],
    queryFn: () => getBucket(id),
  })
}

export const useBatchCreateBucket = () => {
  return useMutation({
    mutationFn: (body: BatchBucketCreateBody[]) => createBatchBucket(body),
  })
}

export const useDeleteBucket = () => {
  return useMutation({
    mutationFn: (id: number) => deleteBucket(id),
  })
}
