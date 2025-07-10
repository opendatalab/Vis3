import { i18n } from '../../i18n'
import { RendererProps } from './Card'
import ContentListCard from './ContentList'
import CsvCard from './Csv'
import HtmlCard from './Html'
import ImageCard from './Image'
import ImageListCard from './ImageList'
import JsonCard from './Json'
import MarkdownCard from './Markdown'
import RawCard from './Raw'

export type TextRender = {
  name: string
  label: string
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
  },
  markdown: {
    label: i18n.t('renderer.markdown'),
    name: 'markdown',
    renderer: MarkdownCard,
  },
  csv: {
    label: 'CSV',
    name: 'csv',
    renderer: CsvCard,
  },
  content_list: {
    label: i18n.t('renderer.contentList'),
    name: 'content_list',
    renderer: ContentListCard,
  },
  img_list: {
    label: i18n.t('renderer.imgList'),
    name: 'img_list',
    renderer: ImageListCard,
  },
}

export function getTextRenderer(name: string) {
  return textRenderers[name]
}

export function registerTextRenderer(name: string, label: string, renderer: React.ComponentType<RendererProps>) {
  if (name === 'jsonl') {
    throw new Error('jsonl cannot be overridden')
  }

  if (name in textRenderers) {
    console.warn(`Text render ${name} already registered, will be overridden`)
  }

  textRenderers[name] = {
    name,
    label,
    renderer,
  }
}

export function getRenderers() {
  return Object.values(textRenderers)
}

export function unregisterTextRenderer(name: string) {
  delete textRenderers[name]
}

export default textRenderers