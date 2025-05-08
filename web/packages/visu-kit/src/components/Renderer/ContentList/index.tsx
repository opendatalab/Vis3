import { Image, Tooltip } from 'antd'
import clsx from 'clsx'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useBucketContext } from '../../../components/BucketPreviewer/context'
import { JsonViewer } from '../../../components/CodeViewer'
import { CodeViewerContext } from '../../../components/CodeViewer/context'
import FullScreenButton from '../../../components/FullscreenButton'
import MarkdownPreview from '../../../components/Markdown'
import type { RendererProps } from '../Card'
import RenderCard from '../Card'
import usePreview from '../stateHooks/usePreview'
import useWrap from '../stateHooks/useWrap'
import styles from './index.module.css'

export interface ContentItem {
  type: 'image' | 'text' | 'audio' | 'video' | 'table' | 'list' | 'code' | 'quote' | 'hr' | 'equation'
  html?: string
  /**
   * 文本的heading级别，0表示普通正文，1表示一级标题，以此类推。当type为text时，该字段才有意义。
   */
  text_level?: number
  text_format?: 'text' | 'md' | 'latex'
  text?: string
  /**
   * 表格的caption，当type为table时，该字段才有意义。
   */
  table_caption?: string
  /**
   * 当type为image时，该字段为图片的url
   */
  img_urls?: string[]
  /**
   * 当type为image时，该字段为图片的hash值
   */
  img_url_hash?: string
  /**
   * 图像的s3路径
   */
  img_path?: string
  /**
   * 图像的alt属性
   */
  img_alt?: string
  /**
   * 当type为image，且图像链接为data url时，该字段为data url的内容。
   */
  img_data?: string
  /**
   * 图像的title属性
   */
  img_title?: string
  /**
   * 图像的caption
   */
  img_caption?: string
  /**
   * 当type为video/audio时，该字段包含了媒体文件的链接。
   */
  sources?: string[]
  md?: string
}

export interface ContentListProps {
  name: string
  data: ContentItem[]
}

function ContentList({ name, data }: ContentListProps) {
  const { previewUrl } = useBucketContext()
  const renderItem = useCallback((item: ContentItem, index: number) => {
    if (item.text_format === 'md') {
      return <MarkdownPreview inline key={`${name}-${index}`} value={item?.md ?? item?.text ?? ''} />
    }

    if (item.type === 'text') {
      return <div className="p-2" key={`${name}-${index}`}>{item?.md ?? item?.text ?? ''}</div>
    }

    if (item.type === 'image') {
      if (item.img_urls?.length) {
        return item.img_urls.map((url) => {
          return <Image src={url} alt={item.img_alt} key={`${name}-${url}`} />
        })
      }

      if (item.img_path) {
        let img_url = item.img_path

        if (item.img_path.startsWith('s3://')) {
          img_url = `${previewUrl}?path=${item.img_path}`
        }

        return <Tooltip title={item.img_caption}><Image src={img_url} alt={item.img_alt} /></Tooltip>
      }
    }
    return <div className="p-2" key={`${name}-${index}`}>{item.text ?? ''}</div>
  }, [name])

  return (
    <div className={clsx('flex flex-col gap-1 p-2', styles.contentList)} title={name}>
      {
        data.map((item, index) => {
          return (
            <div className="flex items-start gap-1 p-1">
              <span className="text-sm text-gray-400">{index + 1}</span>
              {renderItem(item, index)}
            </div>
          )
        })
      }
    </div>
  )
}

export default function ContentListCard({ className, name, value, extraTail }: RendererProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [wrapButton, { wrap }] = useWrap()
  const [stateValue, setStateValue] = useState(value)
  const [previewButton, { preview }] = usePreview()

  useEffect(() => {
    setStateValue(value)
  }, [value])

  const contextValue = useMemo(() => ({
    wrap: wrap ?? false,
    value: stateValue,
    onChange: setStateValue,
  }), [wrap, stateValue, setStateValue])

  return (
    <CodeViewerContext.Provider value={contextValue}>
      <RenderCard
        ref={ref}
        className={className}
        name={name}
        extra={(
          <div className="flex gap-2 items-center">
            {previewButton as React.ReactNode}
            {wrapButton as React.ReactNode}
            <FullScreenButton elementRef={ref} />
            {extraTail}
          </div>
        )}
      >
        {preview
          ? (
            <ContentList name={name} data={stateValue as any} />
          )
          : <JsonViewer />}
      </RenderCard>
    </CodeViewerContext.Provider>
  )
}
