import { usePreviewBlockContext } from '../contexts/preview.context'
import { getTextRenderer } from '../textRender'
import styles from './index.module.css'
import {
  MessageAudio,
  MessageContentContainer,
  MessageImage,
  MessageJsonBlock,
  MessageVideo,
} from './styled'
import type { MessageContentPart } from './types'

export interface MessageContentListProps {
  messageId: string
  content: MessageContentPart[]
}

export default function MessageContentList({ messageId, content }: MessageContentListProps) {
  const { previewUrl } = usePreviewBlockContext()

  if (!content.length) {
    return null
  }

  return (
    <MessageContentContainer className={styles.llmChatContent}>
      {content.map((part, idx) => {
        const key = `${messageId}-${part.type}-${idx}`
        const renderer = getTextRenderer('markdown')
        const MarkdownRenderer = renderer.plain ?? renderer.renderer

        if (part.type === 'text') {
          return (
            <MarkdownRenderer
              className={styles.llmChatMd}
              key={key}
              value={part.value}
            />
          )
        }

        const originalUrl = (part as any).url ?? ''
        const s3PreviewUrl = originalUrl.startsWith('s3://')
          ? `${previewUrl}${previewUrl?.includes('?') ? '&' : '?'}path=${encodeURIComponent(originalUrl)}`
          : originalUrl

        if (part.type === 'image') {
          return (
            <MessageImage
              key={key}
              src={s3PreviewUrl}
              alt={part.alt ?? 'image'}
              loading="lazy"
            />
          )
        }

        if (part.type === 'video') {
          return (
            <MessageVideo
              key={key}
              controls
            >
              <source src={s3PreviewUrl} type={part.mimeType ?? 'video/mp4'} />
              Your browser does not support the video tag.
            </MessageVideo>
          )
        }

        if (part.type === 'audio') {
          return (
            <MessageAudio
              key={key}
              controls
            >
              <source src={s3PreviewUrl} type={part.mimeType ?? 'audio/mpeg'} />
              Your browser does not support the audio element.
            </MessageAudio>
          )
        }

        if (part.type === 'json') {
          return (
            <MessageJsonBlock
              key={key}
            >
              {part.value}
            </MessageJsonBlock>
          )
        }

        return null
      })}
    </MessageContentContainer>
  )
}
