

export function gid() {
  return Math.random().toString(36).substr(2)
}

// 把csv文件解析成json
export function parseCsv(content: string) {
  if (typeof content !== 'string') {
    return {
      headers: [],
      data: [],
    }
  }
  const lines = content.split('\n')
  const headers = lines[0].split(',')

  const data = lines.slice(1).map((line) => {
    const obj: Record<string, string | number> = {}
    line.split(',').forEach((value, index) => {
      obj[headers[index]] = value
    })
    return obj
  })

  return {
    headers,
    data,
  }
}

export function downloadFromUrl(url: string, name?: string) {
  const link = document.createElement('a')
  link.href = url

  if (name) {
    link.setAttribute('download', name)
  }

  document.body.appendChild(link)
  link.click()
  setTimeout(() => {
    document.body.removeChild(link)
  })
}

export function isImage(path: string) {
  return /\.(?:jpg|jpeg|png|gif|bmp|webp)$/.test(path) && !path.endsWith('/')
}

export function isVideo(path: string) {
  return /\.(?:mp4|avi|flv|wmv|mov|webm)$/.test(path) && !path.endsWith('/')
}

export function isAudio(path: string) {
  return /\.(?:mp3|wav|wma|ogg|flac)$/.test(path) && !path.endsWith('/')
}

// 是否是压缩包
export function isZip(path: string) {
  return /\.(?:zip|rar|7z|tar|gz|bz2)$/.test(path) && !path.endsWith('/')
}

export function getBasename(path: string) {
  if (!path || typeof path !== 'string') {
    return ''
  }

  // 兼容path中带中文的情况
  const pathname = new URL(path).pathname
  return decodeURIComponent(pathname.split('/').pop() ?? '')
}

export async function download(url: string, fullPath: string) {
  if (!fullPath.startsWith('s3://')) {
    throw new Error('s3路径必须以s3://开头')
  }

  const basename = fullPath.split('/').pop()!

  try {
    const params = { path: fullPath } as any

    const searchParams = new URLSearchParams(params)
    const downloadUrl = `${url}?${searchParams.toString()}`

    // window.open(downloadUrl, '_blank')
    downloadFromUrl(downloadUrl, basename)
  }
  catch (error) {
    throw new Error('下载失败')
  }
}

export function getBytes(url: string) {
  if (typeof url !== 'string') {
    return
  }

  if (!url) {
    return
  }

  const match = url.match(/bytes=(\d+),(\d+)/)

  if (match) {
    return {
      byte: Number(match[1]),
      size: Number(match[2]),
    }
  }
}

export function getNextUrl(url?: string) {
  if (!url) {
    return ''
  }

  const [path, search] = url.split('?')

  const range = getBytes(search)

  return range ? `${path}?bytes=${range.byte + range.size},0` : ''
}

export function extractBucketName(s3Path: string) {
  if (!s3Path.startsWith('s3://')) {
    return ''
  }

  return s3Path.split('s3://')[1].split('/')[0]
}
