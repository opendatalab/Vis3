import Icon, { CopyOutlined, DownloadOutlined, LoadingOutlined } from '@ant-design/icons'
import formatter from '@labelu/formatter'
import { useQuery } from '@tanstack/react-query'
import { Button, List, Popover, Tag, Tooltip, message } from 'antd'
import clsx from 'clsx'
import { useCallback, useMemo, useRef } from 'react'

import StatisticsSvg from '../../../assets/statistics.svg?react'
import { BucketItemWrapper } from '../../../components/BucketPreviewer/BucketList'
import { useBucketContext } from '../../../components/BucketPreviewer/context'
import FullScreenButton from '../../../components/FullscreenButton'
import { BucketIcon, FolderIcon } from '../../../components/Icon'
import { getFullPath, getPathIcon } from '../../../components/Renderer/utils'
import { download } from '../../../utils'
import type { RendererProps } from '../Card'
import RenderCard from '../Card'
import { usePreviewBlockContext } from '../contexts/preview.context'

export interface FolderRendererProps extends Omit<RendererProps, 'value'> {
  value: BucketItemWrapper[]
  highlightCurrent?: boolean
  pathWithoutQuery: string
  showHeader?: boolean
  onPathChange?: (path: string) => void
  path: string
}

interface BucketInfoProps {
  path: string
}

export function BucketInfo({ path }: BucketInfoProps) {
  const { data, ...sizeQuery } = useQuery({
    queryKey: ['bucket-size', path],
    queryFn: () => Promise.resolve('TODO'),
  })

  return (
    <div className="flex flex-col gap-2">
      <div className="text-base">
        大小：
        {/* @ts-ignore */}
        {sizeQuery.isLoading ? <LoadingOutlined spin /> : formatter.format('fileSize', data?.data)}
      </div>
    </div>
  )
}

export default function FolderRenderer({ path, onPathChange, name, extraTail, titleExtra, value, highlightCurrent, pathWithoutQuery, showHeader = true }: FolderRendererProps) {
  const ref = useRef<HTMLDivElement>(null)
  const { id } = usePreviewBlockContext()
  const { downloadUrl } = useBucketContext()
  const handleDig = useCallback((item: BucketItemWrapper) => () => {
    const fullPath = highlightCurrent ? item.fullPath : getFullPath(item, path)

    onPathChange?.(fullPath!)
    document.dispatchEvent(new CustomEvent('close-bucket-list'))
  }, [path, onPathChange, highlightCurrent])

  const handleCopy = useCallback((item: BucketItemWrapper) => () => {
    navigator.clipboard.writeText(item.fullPath || item.path)
    message.success('已复制到剪贴板')
  }, [])

  const body = useMemo(() => (
    (
      <>
        <List
          className="border-gray-200"
          dataSource={value}
          bordered={!showHeader}
          renderItem={(item) => {
            let icon = null

            if (item.type === 'bucket') {
              icon = <BucketIcon />
            }
            else if (item.type === 'directory') {
              icon = <FolderIcon />
            }
            else {
              icon = getPathIcon(item.fullPath!)
            }

            return (
              <List.Item className={clsx('relative flex justify-between items-start !px-4 gap-4 transition-colors duration-100', {
                'bg-blue-100': highlightCurrent && item.fullPath === pathWithoutQuery,
                'hover:bg-gray-100': item.fullPath !== pathWithoutQuery,
              })}
              >
                <div className="flex gap-2 items-center">
                  <div className="flex gap-2 items-center">
                    <div className="text-[16px]">{icon}</div>
                    <Button type="link" size="small" className="break-all" onClick={handleDig(item)}>
                      {item.path}
                    </Button>
                  </div>
                  <Tooltip title="复制完整路径">
                    <Button
                      className="shrink-0"
                      size="small"
                      type="text"
                      onClick={handleCopy(item)}
                      icon={<CopyOutlined />}
                    />
                  </Tooltip>
                  {item.owner && (
                    <Button
                      className="shrink-0"
                      size="small"
                      type="text"
                      onClick={() => download(downloadUrl,item.fullPath!)}
                      icon={<DownloadOutlined type="text" className="text-primary" />}
                    />
                  )}
                  {item.type === 'directory' && (
                    <Tooltip title="显示目录信息">
                      <Popover
                        title="目录信息"
                        trigger="click"
                        destroyTooltipOnHide
                        content={
                          <BucketInfo path={item.fullPath!} />
                        }
                      >
                        <Button
                          className="shrink-0"
                          size="small"
                          type="text"
                          icon={<Icon component={StatisticsSvg} />}
                        />
                      </Popover>
                    </Tooltip>
                  )}
                </div>
                <div className={clsx('flex gap-1', {
                  hidden: id !== 'origin',
                })}
                >
                  {item.size !== null && <Tag>{formatter.format('fileSize', item.size)}</Tag>}
                  {item.owner && <Tag>{item.owner}</Tag>}

                  {item.last_modified && (
                    <Tag className="!m-0">
                      {formatter.format('dateTime', item.last_modified, {
                        style: 'YYYY-MM-DD HH:mm:ss',
                      })}
                    </Tag>
                  )}
                </div>
              </List.Item>
            )
          }}
        />
      </>
    )
  ), [handleCopy, handleDig, id, highlightCurrent, pathWithoutQuery, showHeader, value])

  if (showHeader) {
    return (
      <RenderCard
        ref={ref}
        name={!path ? 'root' : name}
        className="h-full"
        titleExtra={titleExtra}
        extra={(
          <div className="flex gap-2 items-center">
            <FullScreenButton elementRef={ref} />
            {extraTail}
          </div>
        )}
      >
        {body}
      </RenderCard>
    )
  }

  return body
}
