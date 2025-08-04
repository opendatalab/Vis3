import styled from '@emotion/styled'
import { useEffect, useMemo, useRef, useState } from 'react'

import { TextViewer } from '../../CodeViewer'
import { CodeViewerContext } from '../../CodeViewer/context'
import FullScreenButton from '../../FullscreenButton'
import MarkdownPreview from '../../Markdown'
import type { RendererProps } from '../Card'
import RenderCard from '../Card'
import useCopy from '../stateHooks/useCopy'
import usePreview from '../stateHooks/usePreview'

export type MDRenderType = 'katex' | 'mathjax'

const ExtraContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
`

export default function MarkdownCard({ className, name, value, extraTail }: RendererProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [previewButton, { preview }] = usePreview()
  const [copyButton] = useCopy(value ?? '')
  const [stateValue, setStateValue] = useState(value)

  useEffect(() => {
    setStateValue(value)
  }, [value])
  
  const contextValue = useMemo(() => ({
    wrap: false,
    value: stateValue,
    onChange: (v: string) => {
      setStateValue(v)
    },
  }), [stateValue])

  return (
    <CodeViewerContext.Provider value={contextValue}>
      <RenderCard
        name={name}
        ref={ref}
        className={className}
        extra={(
          <ExtraContainer>
            {previewButton as React.ReactNode}
            <FullScreenButton elementRef={ref as React.RefObject<HTMLElement>} />
            {copyButton}
            {extraTail}
          </ExtraContainer>
        )}
      >
        {preview
          ? (
            <MarkdownPreview value={stateValue ?? ''} />
          )
          : <TextViewer />}
      </RenderCard>
    </CodeViewerContext.Provider>
  )
}
