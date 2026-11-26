import type { AxiosRequestConfig } from 'axios'

import { BaseBucketType } from '@vis3/kit'
import type { ApiErrorResponse } from '../utils/request'
import request from '../utils/request'

export type S3AddressingStyle = 'auto' | 'virtual' | 'path'
export type S3SignatureVersion = 'auto' | 's3v4' | 's3'

export interface S3CompatOptions {
  addressing_style?: S3AddressingStyle
  region?: string
  signature_version?: S3SignatureVersion
  verify_ssl?: boolean
}

export interface BucketParams {
  path?: string
  pageSize?: number
  pageNo?: number
  id?: number
}

export interface BucketDataWithFullPath extends BucketData {
  fullPath: string
}

export interface BucketData extends BaseBucketType {
  name: string
  id?: number
  endpoint?: string
  addressing_style?: S3AddressingStyle
  region?: string
  signature_version?: S3SignatureVersion
  verify_ssl?: boolean

  keychain_name: string | null
  keychain_id: number | null
}

export interface BucketCreateBody extends S3CompatOptions {
  name?: string
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

export interface PingResult extends ApiErrorResponse {
  reachable: boolean
  status_code?: number
}

export interface AccessibleResult extends ApiErrorResponse {
  accessible: boolean
  detected_config?: S3CompatOptions
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

export async function filterBucket(path: string, options?: AxiosRequestConfig<any>): Promise<BucketResponse> {
  return request.get('/bucket/filter', {
    params: {
      path,
    },
    ...options,
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

export interface HeaderParams extends S3CompatOptions {
  endpoint: string
  path: string
  keychain_id: number
}

export async function getDownloadUrl(params: DownloadParams): Promise<string> {
  return request('/bucket/download', {
    params,
  })
}

export async function isBucketAccessible(
  params: HeaderParams,
  options?: AxiosRequestConfig<any>,
): Promise<{ data: AccessibleResult | boolean }> {
  return request('/bucket/accessible', {
    params,
    ...options,
  })
}

export async function ping(
  url: string,
  verifySsl: boolean = true,
  options?: AxiosRequestConfig<any>,
): Promise<{ data: PingResult | boolean }> {
  return request('/bucket/ping', {
    params: {
      url,
      verify_ssl: verifySsl,
    },
    ...options,
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
