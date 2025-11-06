import type {
  MediaContentPart,
  MediaPlaceholder,
  MediaType,
  MessageContentPart,
  NormalizedMessage,
} from './types'

const PLACEHOLDER_KEYS: MediaPlaceholder[] = ['<IMG_CONTEXT>', '<VIDEO_CONTEXT>', '<AUDIO_CONTEXT>']
const MEDIA_PLACEHOLDER_REGEX = /(<IMG_CONTEXT>|<VIDEO_CONTEXT>|<AUDIO_CONTEXT>)/

const PLACEHOLDER_TO_MEDIA: Record<MediaPlaceholder, MediaType> = {
  '<IMG_CONTEXT>': 'image',
  '<VIDEO_CONTEXT>': 'video',
  '<AUDIO_CONTEXT>': 'audio',
}

function createMediaPart(node: unknown): MediaContentPart | undefined {
  if (!node || typeof node !== 'object') {
    return undefined
  }

  const value = node as Record<string, unknown>
  const nodeType = typeof value.type === 'string' ? value.type.toLowerCase() : undefined

  if (nodeType === 'image_url') {
    const url = typeof value.image_url === 'string'
      ? value.image_url
      : typeof (value.image_url as any)?.url === 'string'
        ? (value.image_url as any).url
        : undefined
    if (url) {
      return {
        type: 'image',
        url,
        alt: typeof (value.image_url as any)?.alt === 'string' ? (value.image_url as any).alt : undefined,
      }
    }
  }

  if (nodeType === 'image' && typeof value.url === 'string') {
    return {
      type: 'image',
      url: value.url,
      alt: typeof value.alt === 'string' ? value.alt : undefined,
    }
  }

  if (typeof value.url === 'string' && nodeType && nodeType.includes('image')) {
    return {
      type: 'image',
      url: value.url,
      alt: typeof value.alt === 'string' ? value.alt : undefined,
    }
  }

  if (nodeType === 'video_url') {
    const url = typeof value.video_url === 'string'
      ? value.video_url
      : typeof (value.video_url as any)?.url === 'string'
        ? (value.video_url as any).url
        : undefined
    if (url) {
      return {
        type: 'video',
        url,
        mimeType: typeof (value.video_url as any)?.mime_type === 'string' ? (value.video_url as any).mime_type : undefined,
      }
    }
  }

  if (nodeType === 'video' && typeof value.url === 'string') {
    return {
      type: 'video',
      url: value.url,
      mimeType: typeof value.mime_type === 'string' ? value.mime_type : undefined,
    }
  }

  if (typeof value.url === 'string' && nodeType && nodeType.includes('video')) {
    return {
      type: 'video',
      url: value.url,
      mimeType: typeof value.mime_type === 'string' ? value.mime_type : undefined,
    }
  }

  if (nodeType === 'audio_url') {
    const url = typeof value.audio_url === 'string'
      ? value.audio_url
      : typeof (value.audio_url as any)?.url === 'string'
        ? (value.audio_url as any).url
        : undefined
    if (url) {
      return {
        type: 'audio',
        url,
        mimeType: typeof (value.audio_url as any)?.mime_type === 'string' ? (value.audio_url as any).mime_type : undefined,
      }
    }
  }

  if (nodeType === 'audio' && typeof value.url === 'string') {
    return {
      type: 'audio',
      url: value.url,
      mimeType: typeof value.mime_type === 'string' ? value.mime_type : undefined,
    }
  }

  if (typeof value.url === 'string' && nodeType && nodeType.includes('audio')) {
    return {
      type: 'audio',
      url: value.url,
      mimeType: typeof value.mime_type === 'string' ? value.mime_type : undefined,
    }
  }

  return undefined
}

function extractTextValue(node: unknown): string | undefined {
  if (typeof node === 'string') {
    return node
  }

  if (!node || typeof node !== 'object') {
    return undefined
  }

  const value = node as Record<string, unknown>
  const nodeType = typeof value.type === 'string' ? value.type.toLowerCase() : undefined

  if (nodeType === 'text' && typeof value.text === 'string') {
    return value.text
  }

  if (nodeType === 'input_text' && typeof value.text === 'string') {
    return value.text
  }

  if (typeof value.text === 'string') {
    return value.text
  }

  if (typeof value.content === 'string') {
    return value.content
  }

  if (typeof value.value === 'string') {
    return value.value
  }

  return undefined
}

function normalizeArrayContent(nodes: unknown[]): MessageContentPart[] {
  if (!nodes.length) {
    return []
  }

  const consumedIndexes = new Set<number>()
  const mediaQueues: Record<MediaType, Array<{ index: number; part: MediaContentPart }>> = {
    image: [],
    video: [],
    audio: [],
  }

  nodes.forEach((node, index) => {
    const mediaPart = createMediaPart(node)
    if (mediaPart) {
      mediaQueues[mediaPart.type].push({ index, part: mediaPart })
    }
  })

  const shiftMedia = (placeholder: MediaPlaceholder) => {
    const mediaType = PLACEHOLDER_TO_MEDIA[placeholder]
    const queue = mediaQueues[mediaType]

    while (queue.length) {
      const candidate = queue.shift()
      if (candidate && !consumedIndexes.has(candidate.index)) {
        consumedIndexes.add(candidate.index)
        return candidate.part
      }
    }

    return undefined
  }

  const parts: MessageContentPart[] = []

  nodes.forEach((node, index) => {
    const textValue = extractTextValue(node)

    if (typeof textValue === 'string') {
      const tokens = textValue.split(MEDIA_PLACEHOLDER_REGEX)

      tokens.forEach((token) => {
        if (!token) {
          return
        }

        if (PLACEHOLDER_KEYS.includes(token as MediaPlaceholder)) {
          const mediaPart = shiftMedia(token as MediaPlaceholder)
          if (mediaPart) {
            parts.push(mediaPart)
          }
          return
        }

        parts.push({ type: 'text', value: token })
      })

      return
    }

    const mediaPart = createMediaPart(node)
    if (mediaPart) {
      if (!consumedIndexes.has(index)) {
        consumedIndexes.add(index)
        parts.push(mediaPart)
      }
      return
    }

    parts.push(...normalizeContent(node))
  })

  return parts
}

function normalizeObjectContent(value: Record<string, unknown>): MessageContentPart[] {
  const mediaPart = createMediaPart(value)
  if (mediaPart) {
    return [mediaPart]
  }

  const textValue = extractTextValue(value)
  if (typeof textValue === 'string') {
    return textValue ? [{ type: 'text', value: textValue }] : []
  }

  const content = value.content
  if (Array.isArray(content)) {
    return normalizeArrayContent(content)
  }

  if (content && typeof content === 'object') {
    return normalizeContent(content)
  }

  const nestedValue = value.value
  if (Array.isArray(nestedValue)) {
    return normalizeArrayContent(nestedValue)
  }

  if (nestedValue && typeof nestedValue === 'object') {
    return normalizeContent(nestedValue)
  }

  try {
    return [{
      type: 'json',
      value: JSON.stringify(value, null, 2),
    }]
  }
  catch {
    return [{
      type: 'json',
      value: String(value),
    }]
  }
}

export function normalizeContent(content: unknown): MessageContentPart[] {
  if (content == null) {
    return []
  }

  if (typeof content === 'string') {
    return content ? [{ type: 'text', value: content }] : []
  }

  if (Array.isArray(content)) {
    return normalizeArrayContent(content)
  }

  if (typeof content === 'object') {
    return normalizeObjectContent(content as Record<string, unknown>)
  }

  return [{ type: 'text', value: String(content) }]
}

export function safeParse(value: unknown) {
  if (typeof value !== 'string') {
    return value
  }

  if (!value) {
    return null
  }

  try {
    return JSON.parse(value)
  }
  catch {
    return value
  }
}

export function normalizeMessages(value?: any): NormalizedMessage[] {
  if (typeof value === 'undefined') {
    return []
  }

  if (!value) {
    return []
  }

  if (typeof value === 'string') {
    return [{
      id: '0',
      role: 'system',
      content: [{ type: 'text', value }],
      name: undefined,
    }]
  }

  const collect: any[] = []

  if (Array.isArray(value)) {
    collect.push(...value)
  }
  else if (Array.isArray(value.messages)) {
    collect.push(...value.messages)
  }
  else if (Array.isArray(value.choices)) {
    value.choices.forEach((choice: any) => {
      if (choice?.message) {
        collect.push(choice.message)
      }
      else if (choice?.delta) {
        collect.push(choice.delta)
      }
    })
  }
  else if (value.message) {
    collect.push(value.message)
  }

  return collect
    .map((item, index) => {
      const role = typeof item?.role === 'string' ? item.role : 'assistant'
      const contentParts = normalizeContent(item?.content)
      const extras: string[] = []

      if (item?.function_call) {
        const fn = item.function_call
        const args = typeof fn.arguments === 'string' ? fn.arguments : JSON.stringify(fn.arguments, null, 2)
        extras.push(`Function call: ${fn.name || 'unknown'}\n${args || ''}`)
      }

      if (Array.isArray(item?.tool_calls)) {
        item.tool_calls.forEach((tool: any, idx: number) => {
          if (tool) {
            const args = typeof tool.arguments === 'string' ? tool.arguments : JSON.stringify(tool.arguments, null, 2)
            extras.push(`Tool call #${idx + 1}: ${tool.name || tool.type || 'tool'}\n${args || ''}`)
          }
        })
      }

      if (item?.tool_call_id) {
        extras.push(`Tool call id: ${item.tool_call_id}`)
      }

      const extraParts: MessageContentPart[] = extras
        .filter(Boolean)
        .map(extra => ({ type: 'text', value: extra }))

      return {
        id: item?.id ?? `${index}`,
        role,
        name: typeof item?.name === 'string' ? item.name : undefined,
        content: [...contentParts, ...extraParts],
      }
    })
    .filter(message => message.content.length > 0)
}
