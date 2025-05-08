import { DownOutlined } from '@ant-design/icons'
import type { MenuProps } from 'antd'
import { Divider, Dropdown } from 'antd'
import { useEffect, useMemo, useRef, useState } from 'react'

import { TextViewer } from '../../../components/CodeViewer'
import { CodeViewerContext } from '../../../components/CodeViewer/context'
import FullScreenButton from '../../../components/FullscreenButton'
import MarkdownPreview from '../../../components/Markdown'
import type { RendererProps } from '../Card'
import RenderCard from '../Card'
import useCopy from '../stateHooks/useCopy'
import usePreview from '../stateHooks/usePreview'

export type MDRenderType = 'katex' | 'mathjax'

const markdownRenderers = [
  {
    key: 'katex',
    text: 'KaTex',
    label: (
      <div className="flex flex-col">
        KaTex
        <span className="text-secondary">适合常见md文档，渲染速度快</span>
      </div>
    ),
    value: 'katex',
  },
  {
    key: 'mathjax',
    text: 'MathJax',
    label: (
      <div className="flex flex-col">
        MathJax
        <span className="text-secondary">适合复杂数学公式，渲染速度慢</span>
      </div>
    ),
    value: 'mathjax',
  },
]

export default function MarkdownCard({ className, name, value, extraTail }: RendererProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [previewButton, { preview }] = usePreview()
  const [mdRenderer, setMdRenderer] = useState<MDRenderType>('katex')
  const [copyButton] = useCopy(value)
  const [stateValue, setStateValue] = useState(value)

  useEffect(() => {
    setStateValue(value)
  }, [value])

  const markdownDropdownMenu: MenuProps = useMemo(() => ({
    items: markdownRenderers as MenuProps['items'],
    selectedKeys: [mdRenderer],
    onClick: ({ key }) => {
      setMdRenderer(key as MDRenderType)
    },
  }), [mdRenderer])

  const selectedRenderer = useMemo(() => markdownRenderers.find(item => item.value === mdRenderer), [mdRenderer])

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
        titleExtra={(
          <>
            <Divider type="vertical" />
            <Dropdown menu={markdownDropdownMenu}>
              <div className="flex items-center gap-1 font-normal cursor-pointer">
                {selectedRenderer?.text}
                <DownOutlined />
              </div>
            </Dropdown>
          </>
        )}
        extra={(
          <div className="flex gap-2 items-center">
            {previewButton as React.ReactNode}
            <FullScreenButton elementRef={ref as React.RefObject<HTMLElement>} />
            {copyButton}
            {extraTail}
          </div>
        )}
      >
        {preview
          ? (
            <MarkdownPreview value={stateValue} />
          )
          : <TextViewer />}
      </RenderCard>
    </CodeViewerContext.Provider>
  )
}
