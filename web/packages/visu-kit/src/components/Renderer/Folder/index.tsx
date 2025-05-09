import Icon, { CopyOutlined, DownloadOutlined, LoadingOutlined } from '@ant-design/icons'
import styled from '@emotion/styled'
import formatter from '@labelu/formatter'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from '@visu/i18n'
import { Button, List, Popover, Tag, Tooltip, message } from 'antd'
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

const FlexContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`

const TextBase = styled.div`
  font-size: 1rem;
`

export function BucketInfo({ path }: BucketInfoProps) {
  const { data, ...sizeQuery } = useQuery({
    queryKey: ['bucket-size', path],
    queryFn: () => Promise.resolve('TODO'),
  })
  const { t } = useTranslation()

  if (sizeQuery.isLoading) {
    return <LoadingOutlined spin />
  }

  if (!data) {
    return null
  }

  const size = data?.data
  const totalSize = formatter.format('fileSize', size)

  return (
    <FlexContainer>
      <TextBase>
        {t('renderer.fileSize')} {totalSize}
      </TextBase>
    </FlexContainer>
  )
}

const StyledListItem = styled(List.Item)<{ isHighlighted?: boolean, isNotCurrent?: boolean }>`
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
  font-size: 16px;
`

const ShrinkButton = styled(Button)`
  flex-shrink: 0;
`

const BreakAllButton = styled(Button)`
  word-break: break-all;
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

export default function FolderRenderer({ path, onPathChange, name, extraTail, titleExtra, value, highlightCurrent, pathWithoutQuery, showHeader = true }: FolderRendererProps) {
  const ref = useRef<HTMLDivElement>(null)
  const { id } = usePreviewBlockContext()
  const { downloadUrl } = useBucketContext()
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
      bordered={!showHeader}
      style={{
        backgroundColor: '#fff',
      }}
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
          <StyledListItem 
            isHighlighted={highlightCurrent && item.fullPath === pathWithoutQuery}
            isNotCurrent={item.fullPath !== pathWithoutQuery}
          >
            <FlexRow>
              <FlexRow>
                <IconWrapper>{icon}</IconWrapper>
                <BreakAllButton type="link" size="small" onClick={handleDig(item)}>
                  {item.path}
                </BreakAllButton>
              </FlexRow>
              <Tooltip title={t('renderer.copyFullPath')}>
                <ShrinkButton
                  size="small"
                  type="text"
                  onClick={handleCopy(item)}
                  icon={<CopyOutlined />}
                />
              </Tooltip>
              {item.owner && (
                <ShrinkButton
                  size="small"
                  type="text"
                  onClick={() => download(downloadUrl,item.fullPath!)}
                  icon={<DownloadOutlined type="text" className="text-primary" />}
                />
              )}
              {item.type === 'directory' && (
                <Tooltip title={t('renderer.showDirInfo')}>
                  <Popover
                    title={t('renderer.dirInfo')}
                    trigger="click"
                    destroyTooltipOnHide
                    content={
                      <BucketInfo path={item.fullPath!} />
                    }
                  >
                    <ShrinkButton
                      size="small"
                      type="text"
                      icon={<Icon component={StatisticsSvg} />}
                    />
                  </Popover>
                </Tooltip>
              )}
            </FlexRow>
            <TagInfo isHidden={id !== 'origin'}>
              {item.size !== null && <Tag>{formatter.format('fileSize', item.size)}</Tag>}
              {item.owner && <Tag>{item.owner}</Tag>}

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
  ), [handleCopy, handleDig, id, highlightCurrent, pathWithoutQuery, showHeader, value, t])

  if (showHeader) {
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
