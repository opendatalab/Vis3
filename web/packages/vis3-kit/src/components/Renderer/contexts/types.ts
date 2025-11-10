export interface BaseBucketType {
  type: 'directory' | 'file' | 'bucket'
  path: string
  next?: string
  // file
  content?: string
  size: number | null
  created_by: string | null
  last_modified: string | null
  mimetype: string | null
}

export interface BucketParams {
  pageSize?: number
  pageNo?: number
  path?: string
}