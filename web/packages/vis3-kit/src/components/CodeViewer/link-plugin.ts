import type { Extension } from '@codemirror/state'
import type {
  DecorationSet,
  ViewUpdate,
} from '@codemirror/view'
import {
  Decoration,
  EditorView,
  MatchDecorator,
  ViewPlugin,
  WidgetType,
} from '@codemirror/view'

const newWindowIcon = `<span style="display: inline-block; vertical-align: middle; font-size: 14px"><svg fill-rule="evenodd" viewBox="64 64 896 896" focusable="false" data-icon="export" width="1em" height="1em" fill="currentColor" aria-hidden="true"><path d="M880 912H144c-17.7 0-32-14.3-32-32V144c0-17.7 14.3-32 32-32h360c4.4 0 8 3.6 8 8v56c0 4.4-3.6 8-8 8H184v656h656V520c0-4.4 3.6-8 8-8h56c4.4 0 8 3.6 8 8v360c0 17.7-14.3 32-32 32zM770.87 199.13l-52.2-52.2a8.01 8.01 0 014.7-13.6l179.4-21c5.1-.6 9.5 3.7 8.9 8.9l-21 179.4c-.8 6.6-8.9 9.4-13.6 4.7l-52.4-52.4-256.2 256.2a8.03 8.03 0 01-11.3 0l-42.4-42.4a8.03 8.03 0 010-11.3l256.1-256.3z"></path></svg></span>`
// 匹配常规 JSON 字符串与内嵌转义 JSON 字符串中的链接，避免把闭合 \" 的反斜杠吞入 URL
const defaultRegexp = /"((?:https?:\/\/|s3:\/\/)(?:[^"\\]|\\[^"])*)\\?"/gi

export interface HyperLinkState {
  at: number
  url: string
  anchor: HyperLinkExtensionOptions['anchor']
}

export interface HyperLinkExtensionOptions {
  regexp?: RegExp
  match?: Record<string, string>
  handle?: (value: string, input: string, from: number, to: number) => string
  anchor?: (dom: HTMLAnchorElement) => HTMLAnchorElement
  onS3PathClick?: (path: string) => boolean | void
  onExternalLinkClick?: (url: string) => boolean | void
}

function hyperLinkDecorator(regexp?: RegExp, matchData?: Record<string, string>, matchFn?: (str: string, input: string, from: number, to: number) => string, anchor?: HyperLinkExtensionOptions['anchor']) {
  return new MatchDecorator({
    regexp: regexp || defaultRegexp,
    decorate: (add, from, to, match) => {
      const raw = match[0]
      const matchedUrl = !regexp && typeof match[1] === 'string' ? match[1] : undefined
      let urlStr = matchFn && typeof matchFn === 'function' ? matchFn(raw, match.input, from, to) : (matchedUrl ?? raw)

      // 去除开头和结尾可能存在的引号（兼容自定义 matchFn / regexp）
      urlStr = urlStr.replace(/^"/, '').replace(/\\?"$/, '')

      if (matchData && matchData[raw]) {
        urlStr = matchData[raw]
      }

      const isS3Path = /^s3:\/\//i.test(urlStr)
      const normalizedUrl = isS3Path ? urlStr.replace(/^s3:\/\//i, 's3://') : urlStr

      const markAttributes = {
        class: 'cm-hyper-link-text',
        attributes: {
          'data-url': normalizedUrl,
          'data-link-type': isS3Path ? 's3' : 'external',
        },
      }

      const markFrom = !regexp && typeof matchedUrl === 'string'
        ? from + 1
        : (raw.startsWith('"') ? from + 1 : from)
      const markTo = !regexp && typeof matchedUrl === 'string'
        ? from + 1 + matchedUrl.length
        : (raw.endsWith('"') ? to - 1 : to)

      if (markFrom < markTo) {
        add(markFrom, markTo, Decoration.mark(markAttributes))
      }

      const linkIcon = new HyperLinkIcon({ at: to, url: normalizedUrl, anchor, isS3Path })
      add(to, to, Decoration.widget({ widget: linkIcon, side: 1 }))
    },
  })
}

class HyperLinkIcon extends WidgetType {
  private readonly state: HyperLinkState & { isS3Path: boolean }
  constructor(state: HyperLinkState & { isS3Path: boolean }) {
    super()
    this.state = state
  }

  eq(other: HyperLinkIcon) {
    return this.state.url === other.state.url && this.state.at === other.state.at && this.state.isS3Path === other.state.isS3Path
  }

  toDOM() {
    const wrapper = document.createElement('span')
    wrapper.className = 'cm-hyper-link-icon-wrapper'

    const newWindowLink = document.createElement('a')
    newWindowLink.href = this.state.isS3Path
      ? `/s3?path=${encodeURIComponent(this.state.url)}`
      : this.state.url
    newWindowLink.target = '_blank'
    newWindowLink.innerHTML = newWindowIcon
    newWindowLink.className = 'cm-hyper-link-icon'
    newWindowLink.rel = 'noopener noreferrer nofollow'

    wrapper.appendChild(newWindowLink)

    const anchor = this.state.anchor && this.state.anchor(newWindowLink)
    return anchor || wrapper
  }
}

export function hyperLinkExtension({ regexp, match, handle, anchor, onS3PathClick, onExternalLinkClick }: HyperLinkExtensionOptions = {}) {
  return [
    ViewPlugin.fromClass(
      class HyperLinkView {
        decorator: MatchDecorator
        decorations: DecorationSet

        constructor(view: EditorView) {
          this.decorator = hyperLinkDecorator(regexp, match, handle, anchor)
          this.decorations = this.decorator.createDeco(view)
        }

        update(update: ViewUpdate) {
          if (update.docChanged || update.viewportChanged) {
            this.decorations = this.decorator.updateDeco(update, this.decorations)
          }
        }
      },
      {
        decorations: v => v.decorations,
        eventHandlers: {
          click: (e: MouseEvent, view: EditorView) => {
            if (e.button !== 0 || e.defaultPrevented) {
              return false
            }

            // CodeMirror 高亮会在 mark 内生成子 span，需向上匹配 .cm-hyper-link-text
            const targetEl = e.target instanceof Element ? e.target : (e.target as Node | null)?.parentElement
            const linkEl = targetEl?.closest('.cm-hyper-link-text') as HTMLElement | null
            if (!linkEl) {
              return false
            }

            const selectedText = window.getSelection?.()?.toString()
            if (!view.state.selection.main.empty || (selectedText && selectedText.length > 0)) {
              return false
            }

            const url = linkEl.getAttribute('data-url')
            if (!url) {
              return false
            }

            const isS3Path = linkEl.getAttribute('data-link-type') === 's3' || /^s3:\/\//i.test(url)

            if (isS3Path) {
              if (onS3PathClick) {
                const handled = onS3PathClick(url)
                if (handled !== false) {
                  return true
                }
              }

              const blockContainer = linkEl.closest('[data-block-id]')
              const targetContainer = blockContainer || document
              targetContainer.dispatchEvent(new CustomEvent('s3-path-click', { detail: { path: url } }))
              return true
            }

            if (onExternalLinkClick) {
              const handled = onExternalLinkClick(url)
              if (handled !== false) {
                return true
              }
            }

            const customEvent = new CustomEvent('s3-path-click-in-new-tab', {
              detail: { path: url },
              cancelable: true,
            })
            document.dispatchEvent(customEvent)
            if (!customEvent.defaultPrevented) {
              window.open(url, '_blank', 'noopener,noreferrer')
            }

            return true
          },
        },
      },
    ),
  ]
}

export const hyperLinkStyle = EditorView.baseTheme({
  '.cm-hyper-link-text': {
    textDecoration: 'underline',
    cursor: 'pointer',
    textDecorationStyle: 'dashed',
  },
  '.cm-hyper-link-icon': {
    margin: '0 0 0 4px',
    display: 'inline-block',
    cursor: 'pointer',
    color: 'var(--color-text-secondary)',
  },
  '.cm-hyper-link-icon:hover': {
    color: 'var(--color-primary)',
  },
})

export const hyperLink: Extension = [hyperLinkExtension(), hyperLinkStyle]
