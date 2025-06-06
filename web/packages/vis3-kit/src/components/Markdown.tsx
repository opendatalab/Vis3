import { css, Global } from '@emotion/react'
import styled from '@emotion/styled'
import 'github-markdown-css/github-markdown.css'
import { useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeMathjax from 'rehype-mathjax'
import rehypeRaw from 'rehype-raw'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import { useTheme } from '../theme'

export interface MarkdownPreviewProps {
  value: string
  inline?: boolean
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

export default function MarkdownPreview({ value, inline}: MarkdownPreviewProps) {
  const { tokens } = useTheme();
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
    <MarkdownContainer $inline={inline} className="markdown-body">
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
