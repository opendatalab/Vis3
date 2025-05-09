import styled from '@emotion/styled'
import { Image } from 'antd'
import { useRef } from 'react'

import FullScreenButton from '../../../components/FullscreenButton'
import type { RendererProps } from '../Card'
import RenderCard from '../Card'

const ExtraContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
`

const StyledImage = styled(Image)`
  max-height: 100%;
  max-width: 100%;
  object-fit: contain;
`

export default function ImageCard({ className, name, value, extraTail, titleExtra }: RendererProps) {
  const ref = useRef<HTMLDivElement>(null)

  return (
    <RenderCard
      ref={ref}
      className={className}
      name={name}
      titleExtra={titleExtra}
      extra={(
        <ExtraContainer>
          <FullScreenButton elementRef={ref as React.RefObject<HTMLElement>} />
          {extraTail}
        </ExtraContainer>
      )}
    >
      <StyledImage src={value} alt={value} />
    </RenderCard>
  )
}
