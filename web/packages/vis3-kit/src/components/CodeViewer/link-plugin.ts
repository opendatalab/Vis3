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
const defaultRegexp = /"((?:https?:\/\/|s3:\/\/)[^"]+)"/gi

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
}

function hyperLinkDecorator(regexp?: RegExp, matchData?: Record<string, string>, matchFn?: (str: string, input: string, from: number, to: number) => string, anchor?: HyperLinkExtensionOptions['anchor']) {
  return new MatchDecorator({
    regexp: regexp || defaultRegexp,
    decorate: (add, from, to, match) => {
      const url = match[0]
      let urlStr = matchFn && typeof matchFn === 'function' ? matchFn(url, match.input, from, to) : url

      // 去除开头和结尾的双引号
      urlStr = urlStr.replace(/^"/, '').replace(/"$/, '')

      if (matchData && matchData[url]) {
        urlStr = matchData[url]
      }

      const isS3Path = urlStr.startsWith('s3://')

      const markAttributes = {
        class: 'cm-hyper-link-text',
        attributes: { 'data-url': urlStr },
      } as any

      if (isS3Path) {
        markAttributes.attributes.onclick = `
          const blockContainer = this.closest('[data-block-id]');
          if (blockContainer) {
            blockContainer.dispatchEvent(new CustomEvent('s3-path-click', { detail: { path: '${urlStr}' } }))
          }
        `
      }
      else {
        markAttributes.attributes.onclick = `
          document.dispatchEvent(new CustomEvent('s3-path-click-in-new-tab', { detail: { path: '${urlStr}' } }))
        `
      }

      add(from + 1, to - 1, Decoration.mark(markAttributes))

      const linkIcon = new HyperLinkIcon({ at: to, url: urlStr, anchor, isS3Path })
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
    newWindowLink.href = `${this.state.isS3Path ? `/s3?path=${this.state.url}` : this.state.url}`
    newWindowLink.target = '_blank'
    newWindowLink.innerHTML = newWindowIcon
    newWindowLink.className = 'cm-hyper-link-icon'
    newWindowLink.rel = 'nofollow'

    wrapper.appendChild(newWindowLink)

    const anchor = this.state.anchor && this.state.anchor(newWindowLink)
    return anchor || wrapper
  }
}

export function hyperLinkExtension({ regexp, match, handle }: HyperLinkExtensionOptions = {}) {
  return [
    ViewPlugin.fromClass(
      class HyperLinkView {
        decorator: MatchDecorator
        decorations: DecorationSet

        constructor(view: EditorView) {
          this.decorator = hyperLinkDecorator(regexp, match, handle)
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
