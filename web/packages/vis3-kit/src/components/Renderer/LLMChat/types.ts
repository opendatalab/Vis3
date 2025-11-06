import type { CSSProperties, ReactNode } from 'react'

export type MediaType = 'image' | 'video' | 'audio'

export type MessageContentPart =
  | { type: 'text'; value: string }
  | { type: MediaType; url: string; alt?: string; mimeType?: string }
  | { type: 'json'; value: string }

export type MediaContentPart = Extract<MessageContentPart, { type: MediaType }>

export type MediaPlaceholder = '<IMG_CONTEXT>' | '<VIDEO_CONTEXT>' | '<AUDIO_CONTEXT>'

export interface NormalizedMessage {
  id: string
  role: string
  name?: string
  content: MessageContentPart[]
}

export interface RoleMeta {
  label: string
  icon: ReactNode
  avatarStyle: CSSProperties
}
