import { i18n } from '../../i18n'
import MarkdownPreview from '../Markdown'
import { RendererProps } from './Card'
import ContentListCard from './ContentList'
import CsvCard from './Csv'
import HtmlCard from './Html'
import ImageCard from './Image'
import ImageListCard from './ImageList'
import JsonCard from './Json'
import { ChatRenderer } from './LLMChat'
import MarkdownCard from './Markdown'
import RawCard from './Raw'

export type TextRender = {
  name: string
  label: string
  structured?: boolean
  plain?: React.ComponentType<any>
  renderer: React.ComponentType<any>
}

const textRenderers: Record<string, TextRender> = {
  raw: {
    label: i18n.t('renderer.raw'),
    name: 'raw',
    renderer: RawCard,
  },
  image: {
    label: i18n.t('renderer.image'),
    name: 'image',
    renderer: ImageCard,
  },
  html: {
    label: i18n.t('renderer.html'),
    name: 'html',
    renderer: HtmlCard,
  },
  json: {
    label: i18n.t('renderer.json'),
    name: 'json',
    renderer: JsonCard,
    structured: true,
  },
  markdown: {
    label: i18n.t('renderer.markdown'),
    name: 'markdown',
    plain: MarkdownPreview,
    renderer: MarkdownCard,
  },
  csv: {
    label: 'CSV',
    name: 'csv',
    renderer: CsvCard,
  },
  llm_chat: {
    label: i18n.t('renderer.llmChat'),
    name: 'llm_chat',
    structured: true,
    renderer: ChatRenderer,
  },
  content_list: {
    label: i18n.t('renderer.contentList'),
    name: 'content_list',
    structured: true,
    renderer: ContentListCard,
  },
  img_list: {
    label: i18n.t('renderer.imgList'),
    name: 'img_list',
    structured: true,
    renderer: ImageListCard,
  },
}

export function getTextRenderer(name: string) {
  return textRenderers[name]
}

export interface RendererRegisterOptions {
  label: string
  renderer: React.ComponentType<RendererProps>
  plain?: React.ComponentType<{
    value: string | any
  }>
  structured?: boolean
}

export function registerTextRenderer(name: string, ...args: RendererRegisterOptions[] | [string, React.ComponentType<RendererProps>]) {
  let rest = {
    label: 'unknown',
    renderer: (() => null) as React.ComponentType<any>
  }

  if (typeof args[0] === 'string') {
    rest.label = args[0]
    rest.renderer = args[1] as React.ComponentType<any>
  }
  else if (typeof args[0] === 'object') {
    rest = args[0]
  }
  else {
    throw Error('unsupported renderer register args')
  }

  if (name === 'jsonl') {
    throw new Error('jsonl cannot be overridden')
  }

  if (name in textRenderers) {
    console.warn(`Text render ${name} already registered, will be overridden`)
  }

  textRenderers[name] = {
    name,
    ...rest,
  }
}

export function getRenderers() {
  return Object.values(textRenderers)
}

export function unregisterTextRenderer(name: string) {
  delete textRenderers[name]
}

export default textRenderers