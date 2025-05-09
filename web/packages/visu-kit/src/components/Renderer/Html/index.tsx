import styled from '@emotion/styled'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { TextViewer } from '../../../components/CodeViewer'
import { CodeViewerContext } from '../../../components/CodeViewer/context'
import FullScreenButton from '../../../components/FullscreenButton'
import type { RendererProps } from '../Card'
import RenderCard from '../Card'
import { useFieldContext } from '../contexts/field.context'
import useBase from '../stateHooks/useBase'
import useCopy from '../stateHooks/useCopy'
import usePreview from '../stateHooks/usePreview'
import useWrap from '../stateHooks/useWrap'

const ExtraContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
`

const StyledIframe = styled.iframe`
  border: 0;
  width: 100%;
  flex: 1;
`

function isUrl(value: string) {
  try {
    const url = new URL(value)
    return Boolean(url)
  }
  // eslint-disable-next-line unused-imports/no-unused-vars
  catch (e: any) {
    return false
  }
}

export default function HtmlCard({ className, name, value, extraTail }: RendererProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [wrapButton, { wrap }] = useWrap()
  const [stateValue, setStateValue] = useState(value)
  const [baseurlButton, { base }, , form] = useBase()
  const { value: topValue } = useFieldContext()
  const [previewButton, { preview }] = usePreview()
  const [copyButton] = useCopy(value)

  const initialBaseUrl = useMemo(() => {
    if (topValue && isUrl(topValue.url)) {
      return new URL(topValue.url).origin
    }

    return ''
  }, [topValue])

  useEffect(() => {
    form.setFieldsValue({
      baseUrl: initialBaseUrl,
    })
  }, [initialBaseUrl, form])

  const handleChange = useCallback((value: string) => {
    setStateValue(value)
  }, [])

  useEffect(() => {
    setStateValue(value)
  }, [value])

  const contextValue = useMemo(() => ({
    wrap: wrap ?? false,
    value: stateValue,
    onChange: handleChange,
  }), [wrap, stateValue, handleChange])

  const processedHtml = useMemo(() => {
    if (!base) { return stateValue }

    // 使用正则表达式替换HTML中的绝对路径
    // 匹配href和src属性中的绝对路径（以/开头但不是//开头的路径）
    return stateValue.replace(/(href|src)=(["'])(\/(?!\/).*?)\2/gi, (match, attr, quote, path) => {
      return `${attr}=${quote}${base.replace(/\/+$/, '')}${path}${quote}`
    })
  }, [base, stateValue])

  return (
    <CodeViewerContext.Provider value={contextValue}>
      <RenderCard
        ref={ref}
        className={className}
        name={name}
        bodyStyle={{
          display: 'flex',
          flexDirection: 'column',
        }}
        extra={(
          <ExtraContainer>
            {!preview && wrapButton as React.ReactNode}
            {previewButton as React.ReactNode}
            {baseurlButton as React.ReactNode}
            <FullScreenButton elementRef={ref as React.RefObject<HTMLElement>} />
            {!preview && copyButton}
            {extraTail}
          </ExtraContainer>
        )}
      >
        {preview
          ? (
            <StyledIframe
              sandbox="allow-same-origin"
              srcDoc={processedHtml}
            />
          )
          : <TextViewer />}
      </RenderCard>
    </CodeViewerContext.Provider>
  )
}
