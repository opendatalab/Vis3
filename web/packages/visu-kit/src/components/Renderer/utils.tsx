
import { BucketItem } from '../../types'
import { isAudio, isImage, isVideo, isZip } from '../../utils'

export function getPathType(path: string) {
  let type

  if (!path) {
    return undefined
  }

  const purePath = path.split('?')[0]

  if (isVideo(purePath)) {
    type = 'video'
  }

  if (isImage(purePath)) {
    type = 'image'
  }

  if (isAudio(purePath)) {
    type = 'audio'
  }

  if (isZip(purePath)) {
    type = 'zip'
  }

  if (purePath.endsWith('/')) {
    type = 'folder'
  }

  if (purePath.endsWith('.html') || purePath.endsWith('.htm') || purePath.endsWith('.xhtml')) {
    type = 'html'
  }

  if (purePath.endsWith('.csv')) {
    type = 'csv'
  }

  if (purePath.endsWith('.jsonl') || purePath.endsWith('.jsonl.gz') || purePath.endsWith('.warc') || purePath.endsWith('.warc.gz')) {
    type = 'jsonl'
  }

  if (purePath.endsWith('.json')) {
    type = 'json'
  }

  if (purePath.endsWith('.md') || purePath.endsWith('.markdown')) {
    type = 'markdown'
  }

  if (purePath.endsWith('.pdf')) {
    type = 'pdf'
  }

  if (purePath.endsWith('.xml')) {
    type = 'xml'
  }

  if (purePath.endsWith('.py')) {
    type = 'python'
  }

  if (purePath.endsWith('.xls') || purePath.endsWith('.xlsx')) {
    type = 'csv'
  }

  if (purePath.endsWith('.ppt') || purePath.endsWith('.PPT')) {
    type = 'ppt'
  }

  if (purePath.endsWith('.epub')) {
    type = 'epub'
  }

  if (purePath.endsWith('.mobi')) {
    type = 'mobi'
  }

  return type
}

export function getBasename(path: string) {
  if (!path || typeof path !== 'string') {
    return ''
  }

  // 兼容path中带中文的情况
  const lastPath = path.split('/').pop()
  // 处理path中带?的情况
  return lastPath?.split('?')[0] ?? ''
}

export function getFullPath(input: BucketItem, path: string) {
  let fullPath = input.path

  // 1. abc
  if (!fullPath.startsWith('s3://')) {
    fullPath = `${path}${fullPath}`
  }

  // 2. s3://abc => s3://abc/
  if (['bucket', 'directory'].includes(input.type) && !fullPath.endsWith('/')) {
    fullPath = `${fullPath}/`
  }

  return fullPath
}