import styled from '@emotion/styled'
import { Card, Tooltip } from 'antd'
import type React from 'react'
import type { ForwardedRef } from 'react'
import { forwardRef } from 'react'

import clsx from 'clsx'
import { useRenderCardContext } from './contexts/card.context'

export type RenderCardProps = React.PropsWithChildren<{
  className?: string
  name: string
  title?: string
  titleExtra?: React.ReactNode
  extra?: React.ReactNode
  bodyStyle?: React.CSSProperties
}>

export interface RendererProps {
  className?: string
  name: string
  value: string
  extraTail?: React.ReactNode
  titleExtra?: React.ReactNode
}

const StyledCard = styled(Card)`
  display: flex;
  flex-direction: column;
`

const TitleContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`

const FieldName = styled.span`
  min-width: 48px;
  overflow: hidden;
  text-overflow: ellipsis;
`

function InnerRenderCard({ className, name, title, titleExtra, extra, children, bodyStyle }: RenderCardProps, ref: ForwardedRef<HTMLDivElement>) {
  const { builtIns } = useRenderCardContext()

  return (
    <StyledCard
      ref={ref}
      size="small"
      headStyle={{
        userSelect: 'none',
      }}
      className={clsx(className, 'field-renderer')}
      title={title ?? (
        <TitleContainer>
          <Tooltip title={name}>
            <FieldName className="field-name">{name}</FieldName>
          </Tooltip>
          {builtIns}
          {titleExtra}
        </TitleContainer>
      )}
      extra={extra}
      styles={{
        body: {
          flex: 1,
          minHeight: 0,
          overflow: 'auto',
          paddingLeft: 0,
          paddingRight: 0,
          paddingBottom: 0,
          paddingTop: 0,
          ...bodyStyle,
        },
      }}
    >
      {children}
    </StyledCard>
  )
}

const RenderCard = forwardRef<HTMLDivElement, RenderCardProps>(InnerRenderCard)

RenderCard.displayName = 'RenderCard'

export default RenderCard
