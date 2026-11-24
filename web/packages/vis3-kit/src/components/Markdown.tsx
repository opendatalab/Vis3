import { css, Global } from '@emotion/react'
import styled from '@emotion/styled'
import clsx from 'clsx'
import { useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeMathjax from 'rehype-mathjax'
import rehypeRaw from 'rehype-raw'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import { type ThemeMode, useTheme } from '../theme'
import './markdown-theme.css'

export interface MarkdownPreviewProps {
  value: string
  inline?: boolean
  className?: string
  theme?: ThemeMode
}

const MarkdownContainer = styled.div<{ $inline?: boolean }>`
  ${props => !props.$inline && `
    padding: 1.5rem;
  `}
  
  /* github-markdown-css内容将通过className应用 */
`

const globalStyle = css`
  .markdown-body svg {
    display: inline-block;
  }
`

export default function MarkdownPreview({ value, inline, className, theme }: MarkdownPreviewProps) {
  const { mode } = useTheme();
  const resolvedTheme = theme ?? mode;
  const parsedValue = useMemo(() => {
    try {
      const jsonValue = JSON.parse(value)

      if (Array.isArray(jsonValue)) {
        return jsonValue.join('\n')
      }

      if (typeof jsonValue === 'object') {
        return JSON.stringify(jsonValue, null, 2)
      }

      return value
    }
    catch (err: any) {
      console.warn(err)

      return value
    }
  }, [value])

  return (
    <MarkdownContainer
      $inline={inline}
      data-theme={resolvedTheme}
      className={clsx('markdown-body', className)}
    >
      <Global styles={globalStyle} />
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeMathjax, rehypeRaw]}
      >
        {parsedValue}
      </ReactMarkdown>
    </MarkdownContainer>
  )
}
