import {
  LeftOutlined,
  RightOutlined,
} from '@ant-design/icons'
import { useTranslation } from '@vis3/i18n'
import { Button, Space, Tooltip } from 'antd'
import clsx from 'clsx'
import { useEffect, useState } from 'react'

import { usePreviewBlockContext } from '../../components/Renderer/contexts/preview.context'
import renders from '../../components/Renderer/index'
import type { RendererProps } from '../Renderer/Card'
import styles from './index.module.css'

export interface TextLikePreviewerProps extends Omit<RendererProps, 'value'> {
  className?: string
  style?: React.CSSProperties
  type: string
}

export default function TextLikePreviewer({ name, type, className, extraTail, titleExtra }: TextLikePreviewerProps) {
  const { data, onNext, onPrev, prevable, nextable } = usePreviewBlockContext()
  const [stateContent, setStateContent] = useState('')
  const { t } = useTranslation()

  useEffect(() => {
    setStateContent(data?.content ?? '')
  }, [data])

  const rowAction = ['jsonl', 'json', 'csv', 'txt'].includes(type)
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

  const Render = renders[type as keyof typeof renders] ?? renders.raw

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
