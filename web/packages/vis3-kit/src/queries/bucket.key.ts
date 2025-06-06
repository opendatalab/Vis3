import { BucketParams } from "../types"


export const bucketKey = {
  all: ['bucketKey'] as const,
  lists: () => [...bucketKey.all, 'list'] as const,
  list: (filter: BucketParams) => [...bucketKey.lists(), filter] as const,
  details: () => [...bucketKey.all, 'details'] as const,
  detail: (id: string | number) => [...bucketKey.details(), id] as const,
}
