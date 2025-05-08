import clsx from 'clsx'
import 'github-markdown-css/github-markdown.css'
import { useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeMathjax from 'rehype-mathjax'
import rehypeRaw from 'rehype-raw'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'


export interface MarkdownPreviewProps {
  value: string
  inline?: boolean
}

export default function MarkdownPreview({ value, inline}: MarkdownPreviewProps) {
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
    <ReactMarkdown
        // @ts-ignore
      className={clsx({
        'p-6': !inline,
      }, 'markdown-body')}
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeMathjax, rehypeRaw]}
    >
      {parsedValue}
    </ReactMarkdown>
  )
}
