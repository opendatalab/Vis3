import styled from '@emotion/styled'
import { useEffect, useMemo, useRef, useState } from 'react'

import { TextViewer } from '../../CodeViewer'
import { CodeViewerContext } from '../../CodeViewer/context'
import FullScreenButton from '../../FullscreenButton'
import type { RendererProps } from '../Card'
import RenderCard from '../Card'
import useCopy from '../stateHooks/useCopy'
import useWrap from '../stateHooks/useWrap'

const ExtraContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
`

export default function RawCard({ className, name, value, extraTail, titleExtra }: RendererProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [wrapButton, { wrap }] = useWrap()
  const [copyButton] = useCopy(value)
  const [stateValue, setStateValue] = useState(value)

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
        titleExtra={titleExtra}
        name={name}
        extra={(
          <ExtraContainer>
            <FullScreenButton elementRef={ref as React.RefObject<HTMLElement>} />
            {wrapButton as React.ReactNode}
            {copyButton}
            {extraTail}
          </ExtraContainer>
        )}
      >
        <TextViewer />
      </RenderCard>
    </CodeViewerContext.Provider>
  )
}
