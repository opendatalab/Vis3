import { Button, Modal } from 'antd'
import type { AxiosError } from 'axios'

import {
  AudioIcon,
  BucketIcon,
  CsvIcon,
  DocIcon,
  HtmlIcon,
  ImageIcon,
  JsonIcon,
  MarkdownIcon,
  PdfIcon,
  PythonIcon,
  TxtIcon,
  VideoIcon,
  ZipIcon,
} from '../../components/Icon'
import { BucketItem } from '../../types'
import { isAudio, isImage, isVideo, isZip } from '../../utils'

export const fileTypeIconMapping = {
  json: <JsonIcon />,
  jsonl: <JsonIcon />,
  image: <ImageIcon />,
  txt: <TxtIcon />,
  csv: <CsvIcon />,
  doc: <DocIcon />,
  video: <VideoIcon />,
  audio: <AudioIcon />,
  markdown: <MarkdownIcon />,
  pdf: <PdfIcon />,
  zip: <ZipIcon />,
  html: <HtmlIcon />,
  folder: <BucketIcon />,
  python: <PythonIcon />,
  epub: <DocIcon />,
  mobi: <DocIcon />,
} as const

export type PathType = keyof typeof fileTypeIconMapping

export function getPathIcon(path: string) {
  const type = getPathType(path) || 'txt'

  return fileTypeIconMapping[type]
}

export function getPathType(path: string): PathType | undefined {
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

  return type as PathType
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

export function handleBucketError(e: AxiosError<{ err_code: number, detail: { bucket: string, endpoint: string }[] }> | null, path: string) {
  const errorCode = e?.response?.data?.err_code

  Modal.destroyAll()

  if (errorCode === 40001) {
    Modal.warning({
      title: '暂无查看权限',
      content: '如需获取查看权限，请选择AK&SK并添加此地址',
      footer: (
        <div className="flex gap-2 items-center justify-end pt-4">
          <Button onClick={() => Modal.destroyAll()}>我知道了</Button>
          <Button
            type="primary"
            onClick={() => {
              Modal.destroyAll()
              document.dispatchEvent(new CustomEvent('open-bucket-manager', { detail: { path } }))
            }}
          >
            立即添加
          </Button>
        </div>
      ),
    })
  }

  if (errorCode === 40002) {
    Modal.warning({
      title: '路径不存在或没有此路径访问权限',
      content: (
        <div>
          <p>如路径存在，可自行添加路径授权访问</p>
          <p>
            Step1. 新增密钥：添加对目标路径有权限的S3密钥
          </p>
          <p>Step2. 添加地址：使用此密钥添加地址授权访问</p>
        </div>
      ),
      footer: (
        <div className="flex gap-2 items-center justify-end pt-4">
          <Button onClick={() => Modal.destroyAll()}>我知道了</Button>
          <Button
            type="primary"
            onClick={() => {
              Modal.destroyAll()
              document.dispatchEvent(new CustomEvent('open-bucket-manager', { detail: { path } }))
            }}
          >
            立即添加
          </Button>
        </div>
      ),
    })
  }
}
