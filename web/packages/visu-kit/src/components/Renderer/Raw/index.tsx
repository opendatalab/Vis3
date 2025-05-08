import { useEffect, useMemo, useRef, useState } from 'react'

import { TextViewer } from '../../../components/CodeViewer'
import { CodeViewerContext } from '../../../components/CodeViewer/context'
import FullScreenButton from '../../../components/FullscreenButton'
import type { RendererProps } from '../Card'
import RenderCard from '../Card'
import useCopy from '../stateHooks/useCopy'
import useWrap from '../stateHooks/useWrap'

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
          <div className="flex gap-2 items-center">
            <FullScreenButton elementRef={ref as React.RefObject<HTMLElement>} />
            {wrapButton as React.ReactNode}
            {copyButton}
            {extraTail}
          </div>
        )}
      >
        <TextViewer />
      </RenderCard>
    </CodeViewerContext.Provider>
  )
}
