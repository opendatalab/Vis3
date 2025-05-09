import { CopyOutlined, DownloadOutlined } from '@ant-design/icons'
import styled from '@emotion/styled'
import formatter from '@labelu/formatter'
import { useTranslation } from '@visu/i18n'
import { Button, List, Tag, Tooltip, message } from 'antd'
import { useCallback } from 'react'

import { BucketItem } from '../../types'
import { download } from '../../utils'
import { BucketIcon, FolderIcon } from '../Icon'
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

const ListItem = styled(List.Item)<{ $isHighlighted?: boolean }>`
  position: relative;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  transition: background-color 100ms;
  
  ${props => props.$isHighlighted ? `
    background-color: #e0f2fe;
  ` : `
    &:hover {
      background-color: #f3f4f6;
    }
  `}
`

const ItemContent = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
`

const IconWrapper = styled.div`
  font-size: 16px;
`

const TagsContainer = styled.div<{ $hidden?: boolean }>`
  display: flex;
  gap: 0.25rem;
  ${props => props.$hidden && 'display: none;'}
`

export default function BucketList({ objects, highlightCurrent, pathWithoutQuery, hideRight }: BucketListProps) {
  const { path, onParamsChange, downloadUrl } = useBucketContext()
  const { t } = useTranslation()

  const handleDig = useCallback((item: BucketItemWrapper) => () => {
    const fullPath = highlightCurrent ? item.fullPath : getFullPath(item, path)

    onParamsChange?.({ path: fullPath! })
    document.dispatchEvent(new CustomEvent('close-bucket-list'))
  }, [path, onParamsChange, highlightCurrent])

  const handleCopy = useCallback((item: BucketItemWrapper) => () => {
    navigator.clipboard.writeText(item.fullPath || item.path)
    message.success(t('renderer.copied'))
  }, [t])

  return (
    <List
      bordered
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
          <ListItem $isHighlighted={highlightCurrent && item.fullPath === pathWithoutQuery}>
            <ItemContent>
              <ItemContent>
                <IconWrapper>{icon}</IconWrapper>
                <Button type="link" size="small" style={{ wordBreak: 'break-all' }} onClick={handleDig(item)}>
                  {item.path}
                </Button>
              </ItemContent>
              <Tooltip title={t('renderer.copyFullPath')}>
                <Button
                  style={{ flexShrink: 0 }}
                  size="small"
                  type="text"
                  onClick={handleCopy(item)}
                  icon={<CopyOutlined />}
                />
              </Tooltip>
              {item.owner && (
                <Button
                  style={{ flexShrink: 0 }}
                  size="small"
                  type="text"
                  onClick={() => download(downloadUrl, item.fullPath!)}
                  icon={<DownloadOutlined type="text" style={{ color: 'var(--ant-primary-color)' }} />}
                />
              )}
            </ItemContent>
            <TagsContainer $hidden={hideRight}>
              {item.size !== null && <Tag>{formatter.format('fileSize', item.size)}</Tag>}
              {item.owner && <Tag>{item.owner}</Tag>}

              {item.last_modified && (
                <Tag style={{ margin: 0 }}>
                  {formatter.format('dateTime', item.last_modified, {
                    style: 'YYYY-MM-DD HH:mm:ss',
                  })}
                </Tag>
              )}
            </TagsContainer>
          </ListItem>
        )
      }}
    />
  )
}
