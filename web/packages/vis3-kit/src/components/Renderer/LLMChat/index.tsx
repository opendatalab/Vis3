import { List } from 'antd'
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'

import LayoutLeftIcon from '../../../assets/layout-left.svg?react'
import LayoutRightIcon from '../../../assets/layout-right.svg?react'
import LayoutSplitIcon from '../../../assets/layout-split.svg?react'
import { CodeViewerContext, TextViewer } from '../../CodeViewer'
import FullScreenButton from '../../FullscreenButton'
import RenderCard, { RendererProps } from '../Card'
import usePreview from '../stateHooks/usePreview'
import useS3Prefix from '../stateHooks/useS3Prefix'
import useStatusButton from '../stateHooks/useStatusButton'
import useWrap from '../stateHooks/useWrap'
import { prefixMediaUrls } from './media'
import MessageListItem from './MessageListItem'
import { normalizeMessages, safeParse } from './normalize'
import { ChatContainer, ExtraActions } from './styled'

interface ChatValue extends Record<string, unknown> {
  path_prefix?: string
  messages: any[]
}

export interface LLMChatProps {
  value?: ChatValue
  layout?: 'split' | 'left' | 'right'
}

function LLMChat({ value, layout = 'split' }: LLMChatProps) {
  const messages = useMemo(() => normalizeMessages(value), [value])

  if (!messages.length) {
    return (
      <div>no chat content</div>
    )
  }

  return (
    <ChatContainer>
      <List
        dataSource={messages}
        split={false}
        renderItem={item => (
          <MessageListItem message={item} layout={layout} />
        )}
      />
    </ChatContainer>
  )
}

const layoutOptions = [
  {
    label: <LayoutLeftIcon />,
    value: 'left'
  },
  {
    label: <LayoutSplitIcon />,
    value: 'split'
  },
  {
    label: <LayoutRightIcon />,
    value: 'right'
  },
]

export function ChatRenderer({ className, name, value, extraTail, titleExtra }: RendererProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [wrapButton, { wrap }] = useWrap()
  const [previewButton, { preview }] = usePreview()
  const [stateValue, setStateValue] = useState(value)
  const [trigger, { prefix }, , form] = useS3Prefix()
  const [layoutNode, layout] = useStatusButton('split', layoutOptions)

  console.log('layout', layout)

  useEffect(() => {
    setStateValue(value)
  }, [value])

  const prefixedValue = useMemo(() => {
    if (!prefix || !stateValue) {
      return safeParse(stateValue ?? '')
    }

    try {
      const parsed = safeParse(stateValue)

      if (!parsed || typeof parsed !== 'object') {
        return stateValue
      }

      const [nextValue, changed] = prefixMediaUrls(parsed, prefix)
      if (!changed) {
        return stateValue
      }

      return nextValue
    }
    catch {
      return safeParse(stateValue)
    }
  }, [prefix, stateValue])

  useEffect(() => {
    form.setFieldsValue({
      baseUrl: prefixedValue?.path_prefix,
    })
  }, [prefixedValue?.path_prefix, form])

  const contextValue = useMemo(() => ({
    wrap: wrap ?? false,
    value: prefixedValue,
    onChange: (v: string) => {
      setStateValue(v)
    },
  }), [wrap, prefixedValue])

  return (
    <CodeViewerContext.Provider value={contextValue}>
      <RenderCard
        ref={ref}
        className={className}
        name={name}
        titleExtra={titleExtra}
        extra={(
          <ExtraActions>
            {layoutNode}
            {!preview && wrapButton}
            {previewButton}
            {trigger}
            <FullScreenButton elementRef={ref as unknown as RefObject<HTMLElement>} />
            {extraTail}
          </ExtraActions>
        )}
      >
        {
          preview
            ? (
                <LLMChat value={prefixedValue} layout={layout as 'split' | 'left' | 'right'} />
              )
            : <TextViewer />
        }
      </RenderCard>
    </CodeViewerContext.Provider>
  )
}

export default LLMChat
