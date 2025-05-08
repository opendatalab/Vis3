import { useQuery } from '@tanstack/react-query'
import axios from 'axios'

import { bucketKey } from '../queries/bucket.key'
import { BucketItem, BucketParams } from '../types'

const { CancelToken } = axios

export function useBuckets(bucketUrl: string, enabled = true, params: BucketParams) {
  return useQuery({
    enabled,
    staleTime: 10000,
    queryKey: bucketKey.list(params),
    queryFn: ({ signal }) => {
      const source = CancelToken.source()

      signal?.addEventListener('abort', () => {
        source.cancel()
      })

      return axios.get(bucketUrl, { params, cancelToken: source.token })
    },
    // TODO
    select: data => data.data.data as BucketItem[],
  })
}
