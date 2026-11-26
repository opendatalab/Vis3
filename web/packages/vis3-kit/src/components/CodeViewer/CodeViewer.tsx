import { json } from '@codemirror/lang-json'
import { markdown } from '@codemirror/lang-markdown'
import { python } from '@codemirror/lang-python'
import CodeMirror, { EditorView } from '@uiw/react-codemirror'
import { useCallback, useMemo, useRef } from 'react'

import { useTranslation } from '../../i18n'
import { usePreviewBlockContext } from '../Renderer/contexts/preview.context'
import { useCodeViewerContext } from './context'
import { jsonKeyLink } from './json-key-plugin'
import { hyperLinkExtension, hyperLinkStyle } from './link-plugin'

const plugins = [python(), json(), markdown()]

export interface JsonViewerProps {
  className?: string
}

export function JsonViewer({ className }: JsonViewerProps) {
  const { wrap, value, onChange, onJsonKeyClick, openJsonPreview, jsonBasePath } = useCodeViewerContext()
  const { id: blockId, onLinkClick } = usePreviewBlockContext()

  const onLinkClickRef = useRef(onLinkClick)
  onLinkClickRef.current = onLinkClick
  const blockIdRef = useRef(blockId)
  blockIdRef.current = blockId

  // 用 ref 持有最新回调，避免未 memoize 的 onLinkClick 触发 CodeMirror 扩展重建
  const handleS3PathClick = useCallback((url: string) => {
    if (onLinkClickRef.current) {
      onLinkClickRef.current(url, blockIdRef.current)
      return true
    }

    return false
  }, [])

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
    const handleJsonKeyClick = !openJsonPreview
      ? onJsonKeyClick
      : (detail: { field: string, pathArray: (string | number)[] }) => {
          openJsonPreview([...(jsonBasePath ?? []), ...detail.pathArray])
        }

    const exts = [json(), [hyperLinkExtension({ onS3PathClick: handleS3PathClick }), hyperLinkStyle], jsonKeyLink(handleJsonKeyClick)]

    if (wrap) {
      exts.push(EditorView.lineWrapping as any)
    }

    return exts
  }, [handleS3PathClick, jsonBasePath, onJsonKeyClick, openJsonPreview, wrap])

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
