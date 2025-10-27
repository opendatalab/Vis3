import {
  LeftOutlined,
  RightOutlined,
} from '@ant-design/icons'
import { Button, Space, Tooltip } from 'antd'
import clsx from 'clsx'
import { useEffect, useState } from 'react'

import { useTranslation } from '../../i18n'
import type { RendererProps } from '../Renderer/Card'
import { usePreviewBlockContext } from '../Renderer/contexts/preview.context'
import JsonlCard from '../Renderer/Jsonl'
import textRenderers, { getTextRenderer } from '../Renderer/textRender'
import styles from './index.module.css'

export interface TextLikePreviewerProps extends Omit<RendererProps, 'value'> {
  className?: string
  style?: React.CSSProperties
  type: string
}

export default function TextLikePreviewer({ name, type, className, extraTail, titleExtra }: TextLikePreviewerProps) {
  const { data, onNext, onPrev, prevable, nextable, showSegmentSwitch } = usePreviewBlockContext()
  const [stateContent, setStateContent] = useState<string | undefined>(undefined)
  const { t } = useTranslation()

  useEffect(() => {
    setStateContent(data?.content)
  }, [data])

  const rowAction = showSegmentSwitch && ['jsonl', 'json', 'csv', 'txt'].includes(type)
    ? (
      <Space.Compact>
        <Tooltip title={t('textPreviewer.prevSection')}>
          <Button size="small" type="text" disabled={!prevable} onClick={onPrev} icon={<LeftOutlined />} />
        </Tooltip>
        <Tooltip title={t('textPreviewer.nextSection')}>
          <Button size="small" type="text" disabled={!nextable} onClick={onNext} icon={<RightOutlined />} />
        </Tooltip>
      </Space.Compact>
    )
    : null


  let Render = null
  if (type === 'jsonl') {
    Render = JsonlCard
  } else {
    Render = getTextRenderer(type)?.renderer ?? textRenderers.raw.renderer
  }

  if (!Render) {
    return null
  }

  return (
    <Render
      name={name}
      className={clsx(className, styles.textLikePreviewer)}
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
