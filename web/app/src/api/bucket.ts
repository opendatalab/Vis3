import type { AxiosRequestConfig } from 'axios'

import request from '../utils/request'

export interface BucketParams {
  path?: string
  pageSize?: number
  pageNo?: number

  cluster?: string
}

export interface BucketData {
  name: string
  id?: number
  type: 'directory' | 'file' | 'bucket'
  path: string

  fullPath?: string
  content: string | null
  size: number | null
  last_modified: string | null
  owner: string | null
}

export interface BucketResponse {
  data: BucketData[]
}

export async function digBucket({ pageNo, pageSize, path }: BucketParams = {}, options?: AxiosRequestConfig<any>): Promise<BucketResponse> {
  const params = {
    path: path || '',
  } as {
    path: string
    page_no?: number
    page_size?: number
  }

  if (path && path.endsWith('/')) {
    params.page_no = pageNo || 1
    params.page_size = pageSize || 50
  }

  return request('/v1/bucket', {
    params,
    ...options,
  } as any)
}

export interface DownloadParams {
  path: string
  // 是否作为附件下载
  as_attachment?: boolean
}

export interface HeaderParams {
  endpoint: string
  path: string
  ak_sk: string
}

export async function getDownloadUrl(params: DownloadParams): Promise<string> {
  return request('/v1/bucket/download', {
    params,
  })
}

export async function isBucketAccessible(params: HeaderParams): Promise<string> {
  return request('/v1/bucket/accessible', {
    params,
  })
}

export async function ping(url: string): Promise<string> {
  return request('/v1/bucket/ping', {
    params: {
      url,
    },
  })
}

export async function getFileMimetype(path: string): Promise<string> {
  return request('/v1/bucket/mimetype', {
    params: {
      path,
    },
  })
}

export async function getPathSize(path: string, cluster?: string | null): Promise<string> {
  return request('/v1/bucket/size', {
    params: {
      path,
      cluster,
    },
  })
}
