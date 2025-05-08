import {
  LeftOutlined,
  RightOutlined,
} from '@ant-design/icons'
import { Button, Space, Tooltip } from 'antd'
import clsx from 'clsx'
import { useEffect, useState } from 'react'

import { usePreviewBlockContext } from '../../components/Renderer/contexts/preview.context'
import renders from '../../components/Renderer/index'
import type { PathType } from '../../components/Renderer/utils'
import type { RendererProps } from '../Renderer/Card'
import './index.module.css'

export interface TextLikePreviewerProps extends Omit<RendererProps, 'value'> {
  className?: string
  style?: React.CSSProperties
  type: PathType
}

export default function TextLikePreviewer({ name, type, className, extraTail, titleExtra }: TextLikePreviewerProps) {
  const { id, data, onNext, onPrev, prevable, nextable } = usePreviewBlockContext()
  const [stateContent, setStateContent] = useState('')

  useEffect(() => {
    setStateContent(data?.content ?? '')
  }, [data])

  const rowAction = ['jsonl', 'json', 'csv', 'txt'].includes(type)
    ? (
      <Space.Compact>
        <Tooltip title="上一段">
          <Button size="small" type="text" disabled={!prevable} onClick={onPrev} icon={<LeftOutlined />} />
        </Tooltip>
        <Tooltip title="下一段">
          <Button size="small" type="text" disabled={!nextable} onClick={onNext} icon={<RightOutlined />} />
        </Tooltip>
      </Space.Compact>
    )
    : null

  const Render = renders[type as keyof typeof renders] ?? renders.raw

  return (
    <Render
      name={name}
      className={clsx(className, 'text-like-previewer flex flex-col h-full', {
        'original-previewer': id === 'origin',
      })}
      value={stateContent}
      titleExtra={(
        <>
          {titleExtra}
          {rowAction}
        </>
      )}
      extraTail={extraTail}
    />
  )
}
