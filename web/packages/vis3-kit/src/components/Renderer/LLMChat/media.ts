import type { MediaType } from './types'

const MEDIA_TYPES: MediaType[] = ['image', 'video', 'audio']

const ABSOLUTE_URL_REGEX = /^[a-z][a-z\d+\-.]*:\/\//i
const MEDIA_CONTAINER_KEYS = new Set(['image_url', 'video_url', 'audio_url'])

export function joinPrefixWithPath(prefix: string, url: string) {
  if (!url) {
    return url
  }

  const trimmedUrl = url.trim()
  if (!trimmedUrl) {
    return url
  }

  if (trimmedUrl.startsWith(prefix) || ABSOLUTE_URL_REGEX.test(trimmedUrl)) {
    return trimmedUrl
  }

  const normalizedPrefix = prefix.replace(/\/+$/, '')
  const normalizedPath = trimmedUrl.replace(/^\/+/, '')

  if (!normalizedPrefix) {
    return trimmedUrl
  }

  return `${normalizedPrefix}/${normalizedPath}`
}

export function shouldPrefixKey(key: string, nodeType?: string, parentKey?: string) {
  if (MEDIA_CONTAINER_KEYS.has(key)) {
    return true
  }

  if (key === 'url') {
    if (parentKey && MEDIA_CONTAINER_KEYS.has(parentKey)) {
      return true
    }

    if (nodeType && MEDIA_TYPES.some(type => nodeType.includes(type))) {
      return true
    }
  }

  return false
}

export function prefixMediaUrls(node: unknown, prefix: string, parentKey?: string, inheritedType?: string): [unknown, boolean] {
  if (!node) {
    return [node, false]
  }

  if (Array.isArray(node)) {
    let hasChanges = false
    const nextItems = node.map((item) => {
      const [nextItem, changed] = prefixMediaUrls(item, prefix, parentKey, inheritedType)
      if (changed) {
        hasChanges = true
      }
      return nextItem
    })

    if (hasChanges) {
      return [nextItems, true]
    }

    return [node, false]
  }

  if (typeof node !== 'object') {
    return [node, false]
  }

  const value = node as Record<string, unknown>
  const nodeType = typeof value.type === 'string'
    ? value.type.toLowerCase()
    : inheritedType

  let hasChanges = false
  const result: Record<string, unknown> = {}

  Object.entries(value).forEach(([key, current]) => {
    let nextValue: unknown = current

    if (Array.isArray(current) || (current && typeof current === 'object')) {
      const [nextItem, changed] = prefixMediaUrls(current, prefix, key, nodeType)
      if (changed) {
        hasChanges = true
        nextValue = nextItem
      }
    }
    else if (typeof current === 'string' && shouldPrefixKey(key, nodeType, parentKey)) {
      const prefixed = joinPrefixWithPath(prefix, current)
      if (prefixed !== current) {
        hasChanges = true
        nextValue = prefixed
      }
    }

    result[key] = nextValue
  })

  if (!hasChanges) {
    return [value, false]
  }

  return [result, true]
}
