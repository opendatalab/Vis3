import MessageContentList from './MessageContentList'
import { getRoleMeta } from './roles'
import {
  MessageCard,
  MessageCardContent,
  MessageRow,
  MessageTitle,
  StyledAvatar,
  StyledListItem,
} from './styled'
import type { NormalizedMessage } from './types'

export interface MessageListItemProps {
  message: NormalizedMessage
  layout: 'split' | 'left' | 'right'
}

export default function MessageListItem({ message, layout }: MessageListItemProps) {
  const roleMeta = getRoleMeta(message.role)
  const alignment: 'flex-start' | 'flex-end' = (() => {
    if (layout === 'split') {
      return message.role === 'user' ? 'flex-end' : 'flex-start'
    }

    return layout === 'right' ? 'flex-end' : 'flex-start'
  })()
  const showTrailingAvatar = alignment === 'flex-end'
  const showLeadingAvatar = !showTrailingAvatar
  const cardVariant: 'user' | 'assistant' = showTrailingAvatar ? 'user' : 'assistant'

  return (
    <StyledListItem key={message.id}>
      <MessageRow $align={alignment}>
        {showLeadingAvatar && (
          <StyledAvatar
            icon={roleMeta.icon}
            style={roleMeta.avatarStyle}
          />
        )}
        <MessageCard
          size="small"
          variant="outlined"
          $variant={cardVariant}
        >
          <MessageCardContent>
            <MessageTitle strong>
              {roleMeta.label}
              {message.name ? ` · ${message.name}` : ''}
            </MessageTitle>
            <MessageContentList messageId={message.id} content={message.content} />
          </MessageCardContent>
        </MessageCard>
        {showTrailingAvatar && (
          <StyledAvatar
            icon={roleMeta.icon}
            style={roleMeta.avatarStyle}
          />
        )}
      </MessageRow>
    </StyledListItem>
  )
}
