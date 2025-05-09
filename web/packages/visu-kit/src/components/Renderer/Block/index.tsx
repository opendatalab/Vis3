import { ArrowUpOutlined, CloseOutlined, DownloadOutlined, ExportOutlined, InfoCircleOutlined, LeftOutlined, LoadingOutlined, RightOutlined } from '@ant-design/icons'
import styled from '@emotion/styled'
import formatter from '@labelu/formatter'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from '@visu/i18n'
import { Button, Descriptions, Divider, Input, Popover, Space, Spin, Tooltip } from 'antd'
import type { AxiosError } from 'axios'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { formatBucketList, useBucketContext } from '../../../components/BucketPreviewer/context'
import type { PathType } from '../../../components/Renderer/utils'
import { getPathType, handleBucketError } from '../../../components/Renderer/utils'
import TextLikePreviewer from '../../../components/TextLikePreviewer'
import { useBuckets } from '../../../queries/bucket.query'
import type { BucketItem, BucketParams } from '../../../types'
import { download, getBasename, getBytes, getNextUrl } from '../../../utils'

import axios from 'axios'
import { PreviewBlockContext } from '../contexts/preview.context'
import FolderRenderer from '../Folder'
import MediaCard from '../Media'

export const PAGENATION_CHANGE_EVENT = 'visu-pagenation-change'
export const PATH_CORRECTION_EVENT = 'visu-path-correction'

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
  pathType: PathType
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

export interface RenderBlockProps {
  block: BlockInfo
  updateBlock: (id: string, values: Partial<BlockInfo>) => void
  onClose: () => void
  initialParams?: BucketParams
}

export function RenderBlock({ block, updateBlock, onClose, initialParams }: RenderBlockProps) {
  const { id, path, pathType } = block
  const [pageSize, setPageSize] = useState(initialParams?.pageSize || 50)
  const [pageNo, setPageNo] = useState(initialParams?.pageNo || 1)
  const basename = getBasename(path)
  const { onParamsChange, setTotal, bucketUrl, previewUrl, downloadUrl, mimeTypeUrl } = useBucketContext()
  const { t } = useTranslation()
  
  // 未知的文件类型，包括没有后缀名的文件，供用户选择渲染类型
  const unkonwnFileType = !/\.\w+$/.test(basename)
  const [renderAs, setRenderAs] = useState<string | undefined>()
  const pathWithoutQuery = path.split('?')[0]
  // TODO: 去除mimetype接口调用
  const { data: mimeTypeResult } = useQuery({
    queryKey: ['mimetype', path],
    enabled: !!path && !path.endsWith('/'),
    queryFn: () => axios.get(mimeTypeUrl, { params: { path } }),
  })
  const params = useMemo(() => ({
    path,
    pageNo,
    pageSize,
  }), [path, pageNo, pageSize])

  const { data, error, isFetching } = useBuckets(bucketUrl, true, params)

  const folders = useMemo(() => {
    if (Array.isArray(data)) {
      return formatBucketList(data, pathWithoutQuery)
    }

    return []
  }, [data, pathWithoutQuery])

  useEffect(() => {
    setTotal(folders.length)
  }, [folders, setTotal])

  useEffect(() => {
    handleBucketError(error as AxiosError<{ err_code: number, detail: { bucket: string, endpoint: string }[] }> | null, path)
  }, [error, path])

  useEffect(() => {
    const mimeType = mimeTypeResult?.data
    if (mimeType && unkonwnFileType) {
      setRenderAs(extractRenderAs(mimeType))
    }
  }, [mimeTypeResult, unkonwnFileType])

  const [prevBytes, setPrevBytes] = useState<number[]>([])
  const hasPrev = prevBytes.length > 0
  const fileObject = data as unknown as BucketItem
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

    if (id !== 'origin' || !pathType || !url || !['jsonl', 'csv', 'txt'].includes(pathType)) {
      return
    }

    document.dispatchEvent(new CustomEvent(PATH_CORRECTION_EVENT, { detail: newUrl }))
  }, [id, pathType, url])

  useEffect(() => {
    const handlePagenationChange = (e: CustomEvent) => {
      const { pageNo, pageSize } = e.detail
      setPageNo(pageNo)

      if (pageSize) {
        setPageSize(pageSize)
      }
    }

    document.addEventListener(PAGENATION_CHANGE_EVENT, handlePagenationChange as EventListener)

    return () => {
      document.removeEventListener(PAGENATION_CHANGE_EVENT, handlePagenationChange as EventListener)
    }
  }, [id, onParamsChange])

  const handlePageNoChange = useCallback((pageNo: number) => {
    setPageNo(pageNo)

    if (id === 'origin') {
      onParamsChange?.({ pageNo })
    }
  }, [id, onParamsChange])

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

    if (id === 'origin') {
      onParamsChange?.({ path: nextUrl })
    }
    else {
      updateBlock(id, {
        path: nextUrl,
      })
    }
  }, [id, nextUrl, prevBytes, range?.byte, updateBlock, onParamsChange])

  const handlePrevLine = useCallback(async () => {
    const _prevBytes = prevBytes[prevBytes.length - 1] ?? 0
    const prevUrl = `${url.split('?')[0]}?bytes=${_prevBytes},0`

    setPrevBytes(prevBytes.slice(0, -1))

    // 第一个默认block
    if (id === 'origin') {
      onParamsChange?.({ path: prevUrl })
    }
    else {
      updateBlock(id, {
        path: prevUrl,
      })
    }
  }, [id, prevBytes, updateBlock, onParamsChange, url])

  const onFolderPathChange = useCallback((path: string, _cluster?: string) => {
    updateBlock(id, {
      path,
      pathType: getPathType(path),
    })

    setPageNo(1)

    if (id === 'origin') {
      onParamsChange?.({ path, pageNo: 1 })
    }
  }, [id, onParamsChange, updateBlock])

  const handleGoParent = useCallback(() => {
    let newPath = path
    if (path.endsWith('/')) {
      // s3://abc/ab/ => s3://abc/
      newPath = path.replace(/[^/]+\/$/, '')
    }
    else {
      // s3://abc/ab => s3://abc/
      newPath = path.replace(/[^/]+$/, '')
    }

    if (newPath === 's3://') {
      newPath = ''
    }

    updateBlock(id, {
      path: newPath,
      pathType: getPathType(newPath),
    })

    if (id === 'origin') {
      onParamsChange?.({ path: newPath, pageNo: 1 })
    }
  }, [path, updateBlock, id, onParamsChange])

  const contextValue = useMemo(() => ({
    ...block,
    data: fileObject,
    basename,
    nextable: hasNext && !!nextUrl,
    prevable: hasPrev,
    onNext: handleNextLine,
    onPrev: handlePrevLine,
    goParent: handleGoParent,
    onClose,
  }), [block, data, basename, hasNext, nextUrl, hasPrev, handleNextLine, handlePrevLine, handleGoParent, onClose])

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
                      children: <span>{fileObject?.owner}</span>,
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
          id !== 'origin' && !!path && (
            <Tooltip title={t('renderer.returnToParent')}>
              <Button size="small" type="text" icon={<ArrowUpOutlined />} onClick={handleGoParent} />
            </Tooltip>
          )
        }
        {
          id !== 'origin' && block.pathType === 'folder' && !!path && (
            (
              <Space.Compact size="small">
                <Tooltip title={t('renderer.prevPage')}>
                  <Button
                    disabled={pageNo === 1}
                    onClick={() => {
                      handlePageNoChange(pageNo - 1)
                    }}
                    icon={<LeftOutlined />}
                  />
                </Tooltip>
                <PageInput min={1} readOnly value={pageNo} />
                <Tooltip title={t('renderer.nextPage')}>
                  <Button
                    disabled={isFetching || folders.length < Number(pageSize)}
                    onClick={() => {
                      handlePageNoChange(pageNo + 1)
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
  }, [block.pathType, path, totalSize, fileObject, id, handleGoParent, pageNo, isFetching, folders.length, pageSize, handlePageNoChange, t])

  const extra = useMemo(() => {
    return (
      <>
        {
          id !== 'origin' && (
            <Tooltip title={t('renderer.openInNewTab')}>
              <a href={`${bucketUrl}?path=${encodeURIComponent(path)}&page_size=${pageSize}&page_no=${pageNo}`} target="_blank" rel="noopener noreferrer">
                <Button type="text" size="small" icon={<ExportOutlined />} />
              </a>
            </Tooltip>
          )
        }
        {
          block.pathType !== 'folder' && (
            <Tooltip title={t('renderer.downloadFile')}>
              <Button size="small" type="text" icon={<DownloadOutlined />} onClick={() => download(downloadUrl, pathWithoutQuery)} />
            </Tooltip>
          )
        }
        {
          id !== 'origin' && (
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
  }, [block.pathType, bucketUrl, downloadUrl, id, onClose, pageNo, pageSize, path, pathWithoutQuery, t])

  const content = useMemo(() => {
    if (pathWithoutQuery.endsWith('/') || !path) {
      return (
        <FolderRenderer
          showHeader={id !== 'origin'}
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
      return <TextLikePreviewer name={basename} type={s3PathType as PathType || 'txt'} extraTail={extra} titleExtra={extraTitle} />
    }

    let mediaUrl = `${previewUrl}?path=${encodeURIComponent(path)}`

    if (s3PathType === 'zip') {
      mediaUrl = path
    }

    return <StyledMediaCard name={basename} value={mediaUrl} type={s3PathType as PathType} extraTail={extra} titleExtra={extraTitle} />
  }, [basename, extra, extraTitle, folders, id, isTextLike, onFolderPathChange, path, pathWithoutQuery, s3PathType])

  return (
    <PreviewBlockContext.Provider value={contextValue}>
      {content}
      <StyledSpin
        spinning={isFetching}
        indicator={<LoadingOutlined spin />}
        $visible={isFetching}
      />

    </PreviewBlockContext.Provider>
  )
}
