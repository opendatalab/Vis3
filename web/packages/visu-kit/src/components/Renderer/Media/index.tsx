import { DownloadOutlined } from '@ant-design/icons'
import { Button, Image } from 'antd'
import { useMemo, useRef } from 'react'

import { useBucketContext } from '../../../components/BucketPreviewer/context'
import FullScreenButton from '../../../components/FullscreenButton'
import { download } from '../../../utils'
import type { RendererProps } from '../Card'
import RenderCard from '../Card'
import type { PathType } from '../utils'

export interface MediaCardProps extends RendererProps {
  type: PathType
}

export default function MediaCard({ type, className, name, value, extraTail, titleExtra }: MediaCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const { downloadUrl } = useBucketContext()

  const content = useMemo(() => {
    if (type === 'image') {
      return <Image className="max-h-full max-w-full object-contain" src={value} alt={value} />
    }

    if (type === 'video') {
      return (
        <video className="max-w-full mx-6 max-h-full" src={value} controls />
      )
    }

    if (type === 'audio') {
      return (
        <audio className="w-full mx-6" src={value} controls />
      )
    }

    if (type === 'pdf') {
      return (
        <iframe src={value} className="w-full h-[calc(100vh-9rem)] border-0" title="pdf" />
      )
    }

    if (type === 'mobi') {
      return (
        <iframe src={value} className="w-full h-[calc(100vh-9rem)] border-0" title="mobi" />
      )
    }

    if (type === 'epub') {
      return (
        <iframe src={value} className="w-full h-[calc(100vh-9rem)] border-0" title="epub" />
      )
    }

    if (type === 'zip') {
      return (
        <Button icon={<DownloadOutlined type="text" className="text-primary" />} onClick={() => download(downloadUrl, value)}>
          下载压缩文件
        </Button>
      )
    }
  }, [type, value])

  return (
    <RenderCard
      ref={ref}
      className={className}
      name={name}
      titleExtra={titleExtra}
      bodyStyle={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
      extra={(
        <div className="flex gap-2 items-center">
          <FullScreenButton elementRef={ref as React.RefObject<HTMLElement>} />
          {extraTail}
        </div>
      )}
    >
      {content}
    </RenderCard>
  )
}
