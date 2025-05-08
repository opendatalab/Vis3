import { Card, Tooltip } from 'antd'
import clsx from 'clsx'
import type React from 'react'
import type { ForwardedRef } from 'react'
import { forwardRef } from 'react'

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

function InnerRenderCard({ className, name, title, titleExtra, extra, children, bodyStyle }: RenderCardProps, ref: ForwardedRef<HTMLDivElement>) {
  const { builtIns } = useRenderCardContext()

  return (
    <Card
      ref={ref}
      size="small"
      headStyle={{
        userSelect: 'none',
      }}
      className={clsx(className, 'flex flex-col field-renderer')}
      title={title ?? (
        <div className="flex items-center gap-1">
          <Tooltip title={name}>
            <span className="field-name min-w-[48px] overflow-hidden text-ellipsis">{name}</span>
          </Tooltip>
          {builtIns}
          {titleExtra}
        </div>
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
    </Card>
  )
}

const RenderCard = forwardRef<HTMLDivElement, RenderCardProps>(InnerRenderCard)

RenderCard.displayName = 'RenderCard'

export default RenderCard
