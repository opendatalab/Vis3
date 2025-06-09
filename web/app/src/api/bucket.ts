import type { AxiosRequestConfig } from 'axios'

import request from '../utils/request'

export interface BucketParams {
  path?: string
  pageSize?: number
  pageNo?: number
  id?: number
}

export interface BucketData {
  name: string
  id?: number
  type: 'directory' | 'file' | 'bucket'
  path: string
  
  keychain_name: string | null
  keychain_id: number | null

  fullPath?: string
  content: string | null
  size: number | null
  last_modified: string | null
  created_by: string | null
}

export interface BucketCreateBody {
  name: string
  path: string
  endpoint: string
  keychain_id: number
}

export type BucketUpdateBody = Partial<BucketCreateBody>

export type BatchBucketCreateBody = Omit<BucketCreateBody, 'name'>[]

export interface BucketResponse {
  data: BucketData[]
  total: number
  page_no: number
}

export async function digBucket({ pageNo, pageSize, path, id }: BucketParams = {}, options?: AxiosRequestConfig<any>): Promise<BucketResponse> {
  const params = {
    path: path || '',
    id,
  } as {
    path: string
    page_no?: number
    page_size?: number
    id?: number
  }

  if (path && path.endsWith('/')) {
    params.page_no = pageNo || 1
    params.page_size = pageSize || 50
  }

  return request('/bucket', {
    params,
    ...options,
  } as any)
}

export async function getBucket(id: number): Promise<BucketData> {
  return request(`/bucket/${id}`)
}

export async function updateBucket(id: number, body: BucketUpdateBody): Promise<BucketData> {
  return request.patch(`/bucket/${id}`, body)
}

export async function createBucket(body: BucketCreateBody): Promise<BucketData> {
  return request.post('/bucket', body)
}

export async function createBatchBucket(body: BatchBucketCreateBody[]): Promise<BucketData[]> {
  return request.post('/bucket/batch', body)
}

export async function filterBucket(path: string): Promise<BucketResponse> {
  return request.get('/bucket/filter', {
    params: {
      path,
    },
  })
}

export async function deleteBucket(id: number): Promise<void> {
  return request.delete(`/bucket/${id}`)
}

export interface DownloadParams {
  path: string
  // 是否作为附件下载
  as_attachment?: boolean
}

export interface HeaderParams {
  endpoint: string
  path: string
  keychain_id: number
}

export async function getDownloadUrl(params: DownloadParams): Promise<string> {
  return request('/bucket/download', {
    params,
  })
}

export async function isBucketAccessible(params: HeaderParams): Promise<string> {
  return request('/bucket/accessible', {
    params,
  })
}

export async function ping(url: string): Promise<string> {
  return request('/bucket/ping', {
    params: {
      url,
    },
  })
}

export async function getFileMimetype(path: string): Promise<string> {
  return request('/bucket/mimetype', {
    params: {
      path,
    },
  })
}

export async function getPathSize(path: string, cluster?: string | null): Promise<string> {
  return request('/bucket/size', {
    params: {
      path,
      cluster,
    },
  })
}
