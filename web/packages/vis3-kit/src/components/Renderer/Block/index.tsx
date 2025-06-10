import { ArrowUpOutlined, CloseOutlined, DownloadOutlined, ExportOutlined, InfoCircleOutlined, LeftOutlined, LoadingOutlined, RightOutlined } from '@ant-design/icons'
import styled from '@emotion/styled'
import formatter from '@labelu/formatter'
import { Button, Descriptions, Divider, Input, Popover, Space, Spin, Tooltip } from 'antd'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { useTranslation } from '../../../i18n'
import { getBasename, getBytes, getNextUrl } from '../../../utils'
import TextLikePreviewer from '../../TextLikePreviewer'
import { getPathType } from '../utils'

import { PreviewBlockContext, RenderBlockContextType } from '../contexts/preview.context'
import { BaseBucketType, BucketParams } from '../contexts/types'
import FolderRenderer from '../Folder'
import MediaCard from '../Media'

function formatBucketList(bucketList: BaseBucketType[], parentPath: string) {
  return bucketList.map(item => ({
    ...item,
    path: item.path.replace(parentPath, '').replace(/\/$/, ''),
    fullPath: item.path,
  }))
}

export const PAGENATION_CHANGE_EVENT = 'vis3-pagenation-change'
export const PATH_CORRECTION_EVENT = 'vis3-path-correction'

const StyledBlockWrapper = styled.div`
  height: 100%;
  position: relative;
  min-width: calc(100% / 5);
`

const StyledSpin = styled(Spin)<{ $visible: boolean }>`
  height: 100%;
  position: absolute;
  inset: 0;
  background-color: rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(4px);
  padding-top: 100px;
  justify-content: center;
  display: ${({ $visible }) => $visible ? 'flex' : 'none'};
`

const DescriptionsWrapper = styled(Descriptions)`
  width: 320px;
`

const PageInput = styled(Input)`
  width: 40px;
  text-align: center;
`

const CursorHelp = styled(InfoCircleOutlined)`
  cursor: help;
`

const StyledMediaCard = styled(MediaCard)`
  height: 100%;
`

export interface BlockInfo {
  id: string
  path: string
  pathType: string
}

function extractRenderAs(mimeType: string) {
  if (mimeType.startsWith('image/')) {
    return 'image'
  }
  else if (mimeType.startsWith('video/')) {
    return 'video'
  }

  // pdf、epub
  else if (mimeType.startsWith('application/pdf')) {
    return 'pdf'
  }
  else if (mimeType.startsWith('application/epub')) {
    return 'epub'
  }
  // mobi
  else if (mimeType.startsWith('application/x-mobipocket-ebook')) {
    return 'mobi'
  }
  else if (mimeType.startsWith('application/zip')) {
    return 'zip'
  }
  else if (mimeType.startsWith('application/json')) {
    return 'json'
  }
  else if (mimeType.startsWith('application/jsonl')) {
    return 'jsonl'
  }
  else if (mimeType.startsWith('text/csv')) {
    return 'csv'
  }
  else if (mimeType.startsWith('text/plain')) {
    return 'txt'
  }
}

export interface BucketBlockProps<BucketType extends BaseBucketType> {
  block: BlockInfo
  // updateBlock: (id: string, values: Partial<BlockInfo>) => void
  onClose?: () => void
  dataSource?: BucketType | BucketType[]
  style?: React.CSSProperties
  className?: string
  loading?: boolean
  onDownload?: (path: string) => void
  pageSize?: number
  pageNo?: number
  onPathCorrection?: (path: string) => void
  showGoParent?: boolean
  showPagination?: boolean
  showOpenInNewTab?: boolean
  showDownload?: boolean
  closeable?: boolean
  onChange?: (params: Partial<BucketParams>) => void
  renderBucketItem?: (item: BucketType) => React.ReactNode,
  previewUrl?: string,
  onOpenInNewTab?: (path: string) => void
}

export function BucketBlock<T extends BaseBucketType>({
  block,
  // updateBlock,
  onClose,
  dataSource,
  style,
  className,
  loading,
  onDownload,
  pageSize = 50,
  pageNo = 1,
  onPathCorrection,
  showGoParent,
  showPagination = true,
  onChange,
  closeable = false,
  showOpenInNewTab = false,
  onOpenInNewTab,
  renderBucketItem,
  previewUrl,
  showDownload = true,
}: BucketBlockProps<T>) {
  const { id, path, pathType } = block
  const basename = getBasename(path)
  const { t } = useTranslation()
  
  // 未知的文件类型，包括没有后缀名的文件，供用户选择渲染类型
  const unkonwnFileType = !/\.\w+$/.test(basename)
  const [renderAs, setRenderAs] = useState<string | undefined>()
  const pathWithoutQuery = path.split('?')[0]

  const folders = useMemo(() => {
    if (Array.isArray(dataSource)) {
      return formatBucketList(dataSource, pathWithoutQuery)
    }

    return []
  }, [dataSource, pathWithoutQuery])

  useEffect(() => {
    const mimeType = (dataSource as BaseBucketType)?.mimetype
    if (mimeType && unkonwnFileType) {
      setRenderAs(extractRenderAs(mimeType))
    }
  }, [dataSource, unkonwnFileType])

  const [prevBytes, setPrevBytes] = useState<number[]>([])
  const hasPrev = prevBytes.length > 0
  const fileObject = dataSource as unknown as BaseBucketType
  const url = fileObject?.path ?? ''
  const totalSize = fileObject?.size ?? 0
  const range = getBytes(url.split('?')[1])
  const currentSize = range ? range.byte + range.size : 0
  const nextUrl = getNextUrl(url)
  const hasNext = currentSize < (totalSize || 0)

  useEffect(() => {
    // 解析url中的bytes参数
    const range = getBytes(url)
    let newUrl = url

    if (Number(range?.byte) === 0) {
      newUrl = url.split('?')[0]
    }

    if (!pathType || !url || !['jsonl', 'csv', 'txt'].includes(pathType)) {
      return
    }

    onPathCorrection?.(newUrl)
  }, [pathType, url, onPathCorrection])

  const handlePageNoChange = useCallback((pageNo: number) => {
    onChange?.({ pageNo })
  }, [onChange])

  // 换了文件，清空上一次的 prevBytes
  useEffect(() => {
    setPrevBytes([])
  }, [basename])

  const s3PathType = useMemo(() => {
    return renderAs || pathType || getPathType(path)
  }, [path, pathType, renderAs])
  const isTextLike = !s3PathType || !['image', 'video', 'audio', 'zip', 'jsonl', 'pdf', 'epub', 'mobi'].includes(s3PathType)

  const handleNextLine = useCallback(async () => {
    setPrevBytes([...prevBytes, range?.byte ?? 0])

    onChange?.({ path: nextUrl })
  }, [id, nextUrl, prevBytes, range?.byte, onChange])

  const handlePrevLine = useCallback(async () => {
    const _prevBytes = prevBytes[prevBytes.length - 1] ?? 0
    const prevUrl = `${url.split('?')[0]}?bytes=${_prevBytes},0`

    setPrevBytes(prevBytes.slice(0, -1))

    // 第一个默认block
    onChange?.({ path: prevUrl })
  }, [id, prevBytes, onChange, url])

  const onFolderPathChange = useCallback((path: string) => {
    onChange?.({ path, pageNo: 1 })
  }, [id, onChange])

  const handleGoParent = useCallback(() => {
    let newPath = path
    if (path.endsWith('/')) {
      // s3://abc/ab/ => s3://abc/
      newPath = path.replace(/[^\/]+\/$/, '')
    }
    else {
      // s3://abc/ab => s3://abc/
      newPath = path.replace(/[^\/]+$/, '')
    }

    if (newPath === 's3://') {
      newPath = ''
    }

    onChange?.({ path: newPath, pageNo: 1 })
  }, [path, id, onChange])

  const contextValue = useMemo(() => ({
    ...block,
    data: fileObject as T,
    basename,
    nextable: hasNext && !!nextUrl,
    prevable: hasPrev,
    onNext: handleNextLine,
    onPrev: handlePrevLine,
    goParent: handleGoParent,
    onChange,
    onClose,
    renderBucketItem,
    onDownload,
    dataSource,
    previewUrl,
  } as RenderBlockContextType<T> as unknown as RenderBlockContextType<BaseBucketType>), [block, fileObject, basename, hasNext, nextUrl, hasPrev, handleNextLine, handlePrevLine, handleGoParent, onClose, dataSource, onChange, renderBucketItem, onDownload, previewUrl])

  const extraTitle = useMemo(() => {
    return (
      <>
        {
          block.pathType !== 'folder' && !!path && (
            <Popover
              title={t('renderer.fileInfo')}
              content={(
                <DescriptionsWrapper
                  size="small"
                  items={[
                    {
                      label: t('renderer.fileSize'),
                      span: 3,
                      children: <span>{formatter.format('fileSize', totalSize)}</span>,
                    },
                    {
                      label: t('renderer.author'),
                      span: 3,
                      children: <span>{fileObject?.created_by}</span>,
                    },
                    {
                      label: t('renderer.lastModified'),
                      span: 3,
                      children: fileObject?.last_modified
                        ? formatter.format('dateTime', fileObject.last_modified, {
                          style: 'YYYY-MM-DD HH:mm:ss',
                        })
                        : '',
                    },
                  ]}
                />

              )}
            >
              <CursorHelp />
            </Popover>
          )
        }
        {
          showGoParent && (
            <Tooltip title={t('renderer.returnToParent')}>
              <Button size="small" type="text" icon={<ArrowUpOutlined />} onClick={handleGoParent} />
            </Tooltip>
          )
        }
        {
          showPagination && (
            (
              <Space.Compact size="small">
                <Tooltip title={t('renderer.prevPage')}>
                  <Button
                    disabled={pageNo === 1}
                    onClick={() => {
                      onChange?.({ pageNo: pageNo - 1 })
                    }}
                    icon={<LeftOutlined />}
                  />
                </Tooltip>
                <PageInput min={1} readOnly value={pageNo} />
                <Tooltip title={t('renderer.nextPage')}>
                  <Button
                    disabled={loading || folders.length < Number(pageSize)}
                    onClick={() => {
                      onChange?.({ pageNo: pageNo + 1 })
                    }}
                    icon={<RightOutlined />}
                  />
                </Tooltip>
              </Space.Compact>
            )
          )
        }
      </>
    )
  }, [block.pathType, path, totalSize, fileObject, id, handleGoParent, pageNo, loading, folders.length, pageSize, handlePageNoChange, t, dataSource])

  const extra = useMemo(() => {
    return (
      <>
        {
          showOpenInNewTab && (
            <Tooltip title={t('renderer.openInNewTab')}>
              <Button type="text" size="small" icon={<ExportOutlined />} onClick={() => onOpenInNewTab?.(path)} />
            </Tooltip>
          )
        }
        {
          block.pathType !== 'folder' && showDownload && (
            <Tooltip title={t('renderer.downloadFile')}>
              <Button size="small" type="text" icon={<DownloadOutlined />} onClick={() => onDownload?.(pathWithoutQuery)} />
            </Tooltip>
          )
        }
        {
          closeable && (
            <>
              <Divider type="vertical" />
              <Tooltip title={t('renderer.close')}>
                <Button size="small" type="text" icon={<CloseOutlined />} onClick={onClose} />
              </Tooltip>
            </>
          )
        }
      </>
    )
  }, [block.pathType, id, onClose, pageNo, pageSize, path, pathWithoutQuery, t, onDownload, showDownload])

  const content = useMemo(() => {
    if (pathWithoutQuery.endsWith('/') || !path) {
      return (
        <FolderRenderer
          showBodyOnly={!showGoParent}
          path={path}
          name={path}
          value={folders}
          titleExtra={extraTitle}
          extraTail={extra}
          pathWithoutQuery={pathWithoutQuery}
          onPathChange={onFolderPathChange}
        />
      )
    }

    if (isTextLike || ['jsonl'].includes(s3PathType!)) {
      return <TextLikePreviewer name={basename} type={s3PathType || 'txt'} extraTail={extra} titleExtra={extraTitle} />
    }

    let mediaUrl = `${previewUrl}?path=${encodeURIComponent(path)}`

    if (s3PathType === 'zip') {
      mediaUrl = path
    }

    if (dataSource && 'content' in (dataSource as BaseBucketType) && (dataSource as BaseBucketType).content) {
      mediaUrl = (dataSource as BaseBucketType).content!
    }

    return <StyledMediaCard name={basename} value={mediaUrl} type={s3PathType} extraTail={extra} titleExtra={extraTitle} />
  }, [basename, extra, extraTitle, folders, id, isTextLike, onFolderPathChange, path, pathWithoutQuery, s3PathType, dataSource])


  return (
    <PreviewBlockContext.Provider value={contextValue}>
      <StyledBlockWrapper data-block-id={block.id} style={style} className={className}>
        {content}
        <StyledSpin
          spinning
          indicator={<LoadingOutlined spin />}
          $visible={!!loading}
        />
      </StyledBlockWrapper>
    </PreviewBlockContext.Provider>
  )
}
