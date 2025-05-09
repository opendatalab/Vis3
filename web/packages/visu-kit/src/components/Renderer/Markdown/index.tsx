import { DownOutlined } from '@ant-design/icons'
import styled from '@emotion/styled'
import { useTranslation } from '@visu/i18n'
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

const FlexColumn = styled.div`
  display: flex;
  flex-direction: column;
`

const SecondaryText = styled.span`
  color: var(--ant-color-secondary);
`

const DropdownTrigger = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-weight: normal;
  cursor: pointer;
`

const ExtraContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
`

export default function MarkdownCard({ className, name, value, extraTail }: RendererProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [previewButton, { preview }] = usePreview()
  const [mdRenderer, setMdRenderer] = useState<MDRenderType>('katex')
  const [copyButton] = useCopy(value)
  const [stateValue, setStateValue] = useState(value)
  const { t } = useTranslation()

  const markdownRenderers = useMemo(() => [
    {
      key: 'katex',
      text: 'KaTex',
      label: (
        <FlexColumn>
          KaTex
          <SecondaryText>{t('renderer.katexDesc')}</SecondaryText>
        </FlexColumn>
      ),
      value: 'katex',
    },
    {
      key: 'mathjax',
      text: 'MathJax',
      label: (
        <FlexColumn>
          MathJax
          <SecondaryText>{t('renderer.mathjaxDesc')}</SecondaryText>
        </FlexColumn>
      ),
      value: 'mathjax',
    },
  ], [t])

  useEffect(() => {
    setStateValue(value)
  }, [value])

  const markdownDropdownMenu: MenuProps = useMemo(() => ({
    items: markdownRenderers as MenuProps['items'],
    selectedKeys: [mdRenderer],
    onClick: ({ key }) => {
      setMdRenderer(key as MDRenderType)
    },
  }), [mdRenderer, markdownRenderers])

  const selectedRenderer = useMemo(() => markdownRenderers.find(item => item.value === mdRenderer), [mdRenderer, markdownRenderers])

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
              <DropdownTrigger>
                {selectedRenderer?.text}
                <DownOutlined />
              </DropdownTrigger>
            </Dropdown>
          </>
        )}
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
            <MarkdownPreview value={stateValue} />
          )
          : <TextViewer />}
      </RenderCard>
    </CodeViewerContext.Provider>
  )
}
