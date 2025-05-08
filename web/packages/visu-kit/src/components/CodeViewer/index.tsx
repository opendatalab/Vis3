import { json } from '@codemirror/lang-json'
import { markdown } from '@codemirror/lang-markdown'
import { python } from '@codemirror/lang-python'
import CodeMirror, { EditorView } from '@uiw/react-codemirror'
import clsx from 'clsx'
import { useMemo } from 'react'

import { useCodeViewerContext } from './context'
import { jsonKeyLink } from './json-key-plugin'
import { hyperLink } from './link-plugin'

const plugins = [python(), json(), markdown()]

export interface JsonViewerProps {
  className?: string
}

export function JsonViewer({ className }: JsonViewerProps) {
  const { wrap, value = '', onChange } = useCodeViewerContext()

  const code = useMemo(() => {
    try {
      if (typeof value !== 'string') {
        return JSON.stringify(value, null, 2)
      }

      return JSON.stringify(JSON.parse(value), null, 2)
    }
    catch (err) {
      console.error(err)
      return value
    }
  }, [value])

  const extensions = useMemo(() => {
    const exts = [json(), hyperLink, jsonKeyLink]

    if (wrap) {
      exts.push(EditorView.lineWrapping as any)
    }

    return exts
  }, [wrap])

  return <CodeMirror className={clsx(className, 'border')} value={code} height="auto" extensions={extensions} onChange={onChange} />
}

export function TextViewer({ className }: { className?: string }) {
  const { wrap, value, onChange } = useCodeViewerContext()

  const validJson = useMemo(() => {
    try {
      return JSON.parse(value)
    }
    catch (err) {
      console.error(err)
      return value
    }
  }, [value])

  const code = useMemo(() => {
    if (typeof value !== 'string' && value !== null) {
      try {
        return JSON.stringify(value, null, 2)
      }
      catch (err) {
        console.error(err)
        return `不可解析成字符串的数据的数据: ${typeof value}`
      }
    }

    return value
  }, [value])

  if (typeof validJson === 'object') {
    return <JsonViewer />
  }

  return (
    <CodeMirror className={clsx('border', className)} value={code} height="auto" extensions={wrap ? [EditorView.lineWrapping, ...plugins] : plugins} onChange={onChange} />
  )
}
