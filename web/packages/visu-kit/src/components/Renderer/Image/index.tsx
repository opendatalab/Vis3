import { Image } from 'antd'
import { useRef } from 'react'

import FullScreenButton from '../../../components/FullscreenButton'
import type { RendererProps } from '../Card'
import RenderCard from '../Card'

export default function ImageCard({ className, name, value, extraTail, titleExtra }: RendererProps) {
  const ref = useRef<HTMLDivElement>(null)

  return (
    <RenderCard
      ref={ref}
      className={className}
      name={name}
      titleExtra={titleExtra}
      extra={(
        <div className="flex gap-2 items-center">
          <FullScreenButton elementRef={ref as React.RefObject<HTMLElement>} />
          {extraTail}
        </div>
      )}
    >
      <Image className="max-h-full max-w-full object-contain" src={value} alt={value} />
    </RenderCard>
  )
}
