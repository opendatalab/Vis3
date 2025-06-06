import styled from '@emotion/styled'
import { useTranslation } from '@vis3/i18n'
import { Image } from 'antd'
import { useEffect, useMemo, useRef, useState } from 'react'

import { JsonViewer } from '../../../components/CodeViewer'
import { CodeViewerContext } from '../../../components/CodeViewer/context'
import FullScreenButton from '../../../components/FullscreenButton'
import type { RendererProps } from '../Card'
import RenderCard from '../Card'
import { usePreviewBlockContext } from '../contexts/preview.context'
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

const ErrorContainer = styled.div`
  background-color: #fee2e2;
  padding: 0.5rem;
  color: #ef4444;
`

const ImageListContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.5rem;
`

const ExtraContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
`

function WrappedImage({ url, data }: {
  url: string
  data: any
}) {
  const [isError, setIsError] = useState(false)
  const { previewUrl } = usePreviewBlockContext()

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
  }, [data, isError, url, previewUrl])

  return (
    <Image src={renderUrl} alt={renderUrl} onError={handleOnError} onLoadedData={handleOnLoaded} />
  )
}

function ImageList({ name, data }: ImageListProps) {
  const { t } = useTranslation()
  
  if (!Array.isArray(data)) {
    return <ErrorContainer>{t('renderer.arrayTypeRequired')}</ErrorContainer>
  }

  return (
    <ImageListContainer title={name}>
      {
        data.map((item) => {
          if (typeof item === 'string') {
            return <WrappedImage data={item} url={item} key={item} />
          }

          const _item = item as ImageItem

          return <WrappedImage data={item} url={_item.url} key={_item.url} />
        })
      }
    </ImageListContainer>
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
          <ExtraContainer>
            {previewButton as React.ReactNode}
            {!preview && wrapButton as React.ReactNode}
            <FullScreenButton elementRef={ref as React.RefObject<HTMLElement>} />
            {!preview && copyButton}
            {extraTail}
          </ExtraContainer>
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
