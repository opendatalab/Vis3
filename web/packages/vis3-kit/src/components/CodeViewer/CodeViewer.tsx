import { json } from '@codemirror/lang-json'
import { markdown } from '@codemirror/lang-markdown'
import { python } from '@codemirror/lang-python'
import CodeMirror, { EditorView } from '@uiw/react-codemirror'
import { useMemo } from 'react'

import { useTranslation } from '../../i18n'
import { useCodeViewerContext } from './context'
import { jsonKeyLink } from './json-key-plugin'
import { hyperLink } from './link-plugin'

const plugins = [python(), json(), markdown()]

export interface JsonViewerProps {
  className?: string
}

export function JsonViewer({ className }: JsonViewerProps) {
  const { wrap, value, onChange } = useCodeViewerContext()

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

  if (typeof value === 'undefined') {
    return null
  }

  return <CodeMirror className={className} value={code ?? ''} height="auto" extensions={extensions} onChange={onChange} />
}

export function TextViewer({ className }: { className?: string }) {
  const { wrap, value, onChange } = useCodeViewerContext()
  const { t } = useTranslation()

  const validJson = useMemo(() => {
    try {
      return JSON.parse(value ?? '')
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
        return `${t('codeViewer.unparsableData')}: ${typeof value}`
      }
    }

    return value
  }, [value, t])

  if (typeof validJson === 'object') {
    return <JsonViewer />
  }

  return (
    <CodeMirror className={className} value={code || undefined} height="auto" extensions={wrap ? [EditorView.lineWrapping, ...plugins] : plugins} onChange={onChange} />
  )
}
