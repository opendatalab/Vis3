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

const newWindowIcon = `<span style="display: inline-block; vertical-align: middle; font-size: 18px"><svg t="1725879696156" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="1786" width="1em" height="1em"><path d="M597.333333 213.333333a42.666667 42.666667 0 1 1 0-85.333333h256a42.666667 42.666667 0 0 1 42.666667 42.666667v256a42.666667 42.666667 0 1 1-85.333333 0V273.664l-396.501334 396.501333a42.666667 42.666667 0 0 1-60.330666-60.330666L750.336 213.333333H597.333333zM128 298.666667a85.333333 85.333333 0 0 1 85.333333-85.333334h213.333334a42.666667 42.666667 0 1 1 0 85.333334H213.333333v512h512v-213.333334a42.666667 42.666667 0 1 1 85.333334 0v213.333334a85.333333 85.333333 0 0 1-85.333334 85.333333H213.333333a85.333333 85.333333 0 0 1-85.333333-85.333333V298.666667z" fill="currentColor" p-id="1787"></path></svg></span>`
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
          document.dispatchEvent(new CustomEvent('s3-path-click', { detail: { path: '${urlStr}' } }))
        `
      }
      else {
        markAttributes.attributes.onclick = `
          window.open('${urlStr}', '_blank')
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
