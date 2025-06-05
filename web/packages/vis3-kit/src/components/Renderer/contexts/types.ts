export interface BaseBucketType {
  type: 'directory' | 'file' | 'bucket'
  path: string
  // file
  content: string | null
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