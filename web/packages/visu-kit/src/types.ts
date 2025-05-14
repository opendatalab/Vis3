export interface BucketItem {
  name: string
  id?: number
  type: 'directory' | 'file' | 'bucket'
  path: string
  content: string | null
  size: number | null
  last_modified: string | null
  owner: string | null
  mimetype: string | null
}

export interface BucketParams {
  pageSize?: number
  pageNo?: number
  path?: string
}