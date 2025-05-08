import Icon, { CopyOutlined, DownloadOutlined } from '@ant-design/icons'
import formatter from '@labelu/formatter'
import { Button, List, Popover, Tag, Tooltip, message } from 'antd'
import clsx from 'clsx'
import { useCallback } from 'react'

import StatisticsSvg from '../../assets/statistics.svg?react'
import { BucketItem } from '../../types'
import { download } from '../../utils'
import { BucketIcon, FolderIcon } from '../Icon'
import { BucketInfo } from '../Renderer/Folder'
import { getFullPath, getPathIcon } from '../Renderer/utils'
import { useBucketContext } from './context'

export interface BucketItemWrapper extends BucketItem {
  fullPath: string
}

export interface BucketListProps {
  objects: BucketItemWrapper[]
  highlightCurrent?: boolean
  pathWithoutQuery: string
  hideRight?: boolean
}

interface BucketInfoProps {
  path: string
}

export default function BucketList({ objects, highlightCurrent, pathWithoutQuery, hideRight }: BucketListProps) {
  const { path, onParamsChange, downloadUrl } = useBucketContext()

  const handleDig = useCallback((item: BucketItemWrapper) => () => {
    const fullPath = highlightCurrent ? item.fullPath : getFullPath(item, path)

    onParamsChange?.({ path: fullPath! })
    document.dispatchEvent(new CustomEvent('close-bucket-list'))
  }, [path, onParamsChange, highlightCurrent])

  const handleCopy = useCallback((item: BucketItemWrapper) => () => {
    navigator.clipboard.writeText(item.fullPath || item.path)
    message.success('已复制到剪贴板')
  }, [])

  return (
    <List
      bordered
      className="border-gray-200"
      dataSource={objects}
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
          <List.Item className={clsx('relative flex justify-between items-start gap-4 transition-colors duration-100', {
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
                  onClick={() => download(downloadUrl, item.fullPath!)}
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
              hidden: hideRight,
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
  )
}
