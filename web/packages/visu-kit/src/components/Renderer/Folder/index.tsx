import { CopyOutlined, DownloadOutlined } from '@ant-design/icons'
import styled from '@emotion/styled'
import formatter from '@labelu/formatter'
import { useTranslation } from '@vis3/i18n'
import { Button, List, Tag, Tooltip, message } from 'antd'
import { useCallback, useMemo, useRef } from 'react'

import FullScreenButton from '../../../components/FullscreenButton'
import { getFullPath } from '../../../components/Renderer/utils'
import { BucketItem } from '../../../types'
import { FileIcon } from '../../FileIcon'
import type { RendererProps } from '../Card'
import RenderCard from '../Card'
import { usePreviewBlockContext } from '../contexts/preview.context'

export interface BucketItemWrapper extends BucketItem {
  fullPath: string
}

export interface FolderRendererProps extends Omit<RendererProps, 'value'> {
  value: BucketItemWrapper[]
  highlightCurrent?: boolean
  pathWithoutQuery: string
  showBodyOnly?: boolean
  onPathChange?: (path: string) => void
  path: string
}

const StyledListItem = styled(List.Item)<{ isHighlighted?: boolean, isNotCurrent?: boolean, noRadius?: boolean }>`
  position: relative;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding-left: 1rem !important;
  padding-right: 1rem !important;
  gap: 1rem;
  transition: background-color 0.1s;
  
  ${props => props.isHighlighted && `
    background-color: #DBEAFE;
  `}
  
  ${props => props.isNotCurrent && `
    &:hover {
      background-color: #eff4ff;
    }
  `}

  ${props => props.noRadius ? `
    border-radius: 0;
  ` : `
    &:first-child:hover {
      border-top-left-radius: 0.5rem;
      border-top-right-radius: 0.5rem;
    }

    &:last-child:hover {
      border-bottom-left-radius: 0.5rem;
      border-bottom-right-radius: 0.5rem;
    }
  `}
`

const FlexRow = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
`

const IconWrapper = styled.div`
  font-size: 1rem;
  width: 1rem;
  height: 1rem;
`

const ShrinkButton = styled(Button)`
  flex-shrink: 0;
`

const TagInfo = styled(FlexRow)<{ isHidden?: boolean }>`
  display: flex;
  gap: 0.25rem;
  
  ${props => props.isHidden && `
    display: none;
  `}
`

const TagWithoutMargin = styled(Tag)`
  margin: 0 !important;
`

const ExtraContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
`

const Link = styled.a`
  text-decoration: none;
  color: #333;

  &:hover {
    text-decoration: underline;
  }
`

export default function FolderRenderer({ path, onPathChange, name, extraTail, titleExtra, value, highlightCurrent, pathWithoutQuery, showBodyOnly = false }: FolderRendererProps) {
  const ref = useRef<HTMLDivElement>(null)
  const { id, onDownload, renderBucketItem } = usePreviewBlockContext()
  const { t } = useTranslation()
  const handleDig = useCallback((item: BucketItemWrapper) => () => {
    const fullPath = highlightCurrent ? item.fullPath : getFullPath(item, path)

    onPathChange?.(fullPath!)
    document.dispatchEvent(new CustomEvent('close-bucket-list'))
  }, [path, onPathChange, highlightCurrent])

  const handleCopy = useCallback((item: BucketItemWrapper) => () => {
    navigator.clipboard.writeText(item.fullPath || item.path)
    message.success(t('renderer.copied'))
  }, [t])

  const body = useMemo(() => (
    <List
      dataSource={value}
      size="small"
      bordered={showBodyOnly}
      style={{
        backgroundColor: '#fff',
      }}
      renderItem={(item) => {
        if (typeof renderBucketItem === 'function' && !pathWithoutQuery) {
          return renderBucketItem(item)
        }

        let icon = null

        if (item.type === 'bucket') {
          icon = <FileIcon type="bucket" path={item.fullPath!} />
        }
        else if (item.type === 'directory') {
          icon = <FileIcon type="folder" />
        }
        else {
          icon = <FileIcon path={item.fullPath!} />
        }

        return (
          <StyledListItem 
            isHighlighted={highlightCurrent && item.fullPath === pathWithoutQuery}
            isNotCurrent={item.fullPath !== pathWithoutQuery}
            noRadius={!showBodyOnly}
          >
            <FlexRow>
              <FlexRow>
                <IconWrapper>{icon}</IconWrapper>
                <Link href="javascript:void(0)" onClick={handleDig(item)} rel="noreferrer">
                  {item.path}
                </Link>
              </FlexRow>
              <Tooltip title={t('renderer.copyFullPath')}>
                <ShrinkButton
                  size="small"
                  type="text"
                  onClick={handleCopy(item)}
                  icon={<CopyOutlined />}
                />
              </Tooltip>
              {item.created_by && (
                <ShrinkButton
                  size="small"
                  type="text"
                  onClick={() => onDownload?.(item.fullPath!)}
                  icon={<DownloadOutlined type="text" />}
                />
              )}
            </FlexRow>
            <TagInfo>
              {item.size !== null && <Tag>{formatter.format('fileSize', item.size)}</Tag>}
              {item.created_by && <Tag>{item.created_by}</Tag>}

              {item.last_modified && (
                <TagWithoutMargin>
                  {formatter.format('dateTime', item.last_modified, {
                    style: 'YYYY-MM-DD HH:mm:ss',
                  })}
                </TagWithoutMargin>
              )}
            </TagInfo>
          </StyledListItem>
        )
      }}
    />
  ), [handleCopy, handleDig, id, highlightCurrent, pathWithoutQuery, showBodyOnly, value, t])

  if (!showBodyOnly) {
    return (
      <RenderCard
        ref={ref}
        name={!path ? 'root' : name}
        className="h-full"
        titleExtra={titleExtra}
        extra={(
          <ExtraContainer>
            <FullScreenButton elementRef={ref} />
            {extraTail}
          </ExtraContainer>
        )}
      >
        {body}
      </RenderCard>
    )
  }

  return body
}
