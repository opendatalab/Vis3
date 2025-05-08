import { Image } from 'antd'
import { useEffect, useMemo, useRef, useState } from 'react'

import { useBucketContext } from '../../../components/BucketPreviewer/context'
import { JsonViewer } from '../../../components/CodeViewer'
import { CodeViewerContext } from '../../../components/CodeViewer/context'
import FullScreenButton from '../../../components/FullscreenButton'
import type { RendererProps } from '../Card'
import RenderCard from '../Card'
import useCopy from '../stateHooks/useCopy'
import usePreview from '../stateHooks/usePreview'
import useWrap from '../stateHooks/useWrap'

export interface ImageItem {
  url: string
  img_size: [number, number]
}

export interface ImageListProps {
  data: string[] | ImageItem[]
  name: string
}

function WrappedImage({ url, data }: {
  url: string
  data: any
}) {
  const [isError, setIsError] = useState(false)
  const { previewUrl } = useBucketContext()

  const handleOnError = () => {
    setIsError(true)
  }

  const handleOnLoaded = () => {
    setIsError(false)
  }

  const renderUrl = useMemo(() => {
    const s3Path = data?.raw_path ?? ''

    if (isError) {
      return `${previewUrl}?path=${s3Path}`
    }

    if (url.startsWith('s3://')) {
      return `${previewUrl}?path=${url}`
    }

    if (!url.startsWith('http') && !url.startsWith('https') && s3Path) {
      return `${previewUrl}?path=${s3Path}`
    }

    return url
  }, [data, isError, url])

  return (
    <Image src={renderUrl} alt={renderUrl} onError={handleOnError} onLoadedData={handleOnLoaded} />
  )
}

function ImageList({ name, data }: ImageListProps) {
  if (!Array.isArray(data)) {
    return <div className="bg-red-100 p-2 text-red-500">必须为数组类型</div>
  }

  return (
    <div className="flex flex-col gap-2 p-2" title={name}>
      {
        data.map((item) => {
          if (typeof item === 'string') {
            return <WrappedImage data={item} url={item} key={item} />
          }

          const _item = item as ImageItem

          return <WrappedImage data={item} url={_item.url} key={_item.url} />
        })
      }
    </div>
  )
}

export default function ImageListCard({ className, name, value, extraTail }: RendererProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [wrapButton, { wrap }] = useWrap()
  const [stateValue, setStateValue] = useState(value)
  const [previewButton, { preview }] = usePreview()
  const [copyButton] = useCopy(value)

  useEffect(() => {
    setStateValue(value)
  }, [value])

  const contextValue = useMemo(() => ({
    wrap: wrap ?? false,
    value: stateValue,
    onChange: setStateValue,
  }), [wrap, stateValue])

  return (
    <CodeViewerContext.Provider value={contextValue}>
      <RenderCard
        ref={ref}
        className={className}
        name={name}
        extra={(
          <div className="flex gap-2 items-center">
            {previewButton as React.ReactNode}
            {!preview && wrapButton as React.ReactNode}
            <FullScreenButton elementRef={ref as React.RefObject<HTMLElement>} />
            {!preview && copyButton}
            {extraTail}
          </div>
        )}
      >
        {preview
          ? (
            <ImageList name={name} data={stateValue as any} />
          )
          : <JsonViewer />}
      </RenderCard>
    </CodeViewerContext.Provider>
  )
}
