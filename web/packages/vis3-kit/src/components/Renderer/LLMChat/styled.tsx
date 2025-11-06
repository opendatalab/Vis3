import styled from '@emotion/styled'
import { Avatar, Card, Image, List, Typography } from 'antd'

export const MessageContentContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`

export const MessageImage = styled(Image as any)`
  max-height: 20rem;
  width: 100%;
`

export const MessageVideo = styled.video`
  max-height: 20rem;
  width: 100%;
  border-radius: 0.75rem;
  border: 1px solid #e2e8f0;
`

export const MessageAudio = styled.audio`
  width: 100%;
  border-radius: 0.75rem;
  border: 1px solid #e2e8f0;
`

export const MessageJsonBlock = styled.pre`
  max-width: 100%;
  overflow: auto;
  border-radius: 0.25rem;
  background-color: rgba(15, 23, 42, 0.8);
  padding: 0.75rem;
  font-size: 0.75rem;
  line-height: 1.125rem;
  color: #ffffff;
`

export const StyledListItem = styled(List.Item as any)`
  border-bottom: 0 !important;
  padding-top: 0.75rem;
  padding-bottom: 0.75rem;
`

export const MessageRow = styled.div<{ $align: 'flex-start' | 'flex-end' }>`
  display: flex;
  width: 100%;
  align-items: flex-start;
  gap: 0.75rem;
  justify-content: ${({ $align }) => $align};
`

export const MessageCard = styled(Card as any)<{ $variant: 'user' | 'assistant' }>`
  max-width: 75%;
  box-shadow: none !important;
  ${({ $variant }) => $variant === 'user'
    ? `
        background-color: #f1f5f9;
        border: 1px solid #e2e8f0;
      `
    : `
        background-color: #fff;
        border: 1px solid #e2e2e2;
      `}

  .ant-card-body {
    padding: 0.75rem 1rem;
  }
`

export const MessageCardContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`

export const MessageTitle = styled(Typography.Text as any)`
  font-size: 0.875rem;
  line-height: 1.25rem;
`

export const StyledAvatar = styled(Avatar as any)`
  display: flex;
  align-items: center;
  justify-content: center;
`

export const ChatContainer = styled.div`
  padding: 1rem;
`

export const ExtraActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`
