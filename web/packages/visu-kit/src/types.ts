export interface BucketItem {
  // common
  name: string
  id: number
  type: 'directory' | 'file' | 'bucket'
  path: string
  created_by: string | null
  // file
  content: string | null
  size: number | null
  last_modified: string | null
  mimetype: string | null
}

export interface BucketParams {
  pageSize?: number
  pageNo?: number
  path?: string
}