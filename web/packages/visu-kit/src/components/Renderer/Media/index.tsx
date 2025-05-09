import { DownloadOutlined } from '@ant-design/icons'
import styled from '@emotion/styled'
import { useTranslation } from '@visu/i18n'
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

const StyledImage = styled(Image)`
  max-height: 100%;
  max-width: 100%;
  object-fit: contain;
`

const StyledVideo = styled.video`
  max-width: 100%;
  margin-left: 1.5rem;
  margin-right: 1.5rem;
  max-height: 100%;
`

const StyledAudio = styled.audio`
  width: 100%;
  margin-left: 1.5rem;
  margin-right: 1.5rem;
`

const StyledIframe = styled.iframe`
  width: 100%;
  height: calc(100vh - 9rem);
  border: 0;
`

const PrimaryButton = styled(Button)`
  .ant-btn-icon {
    color: var(--ant-primary-color);
  }
`

const ExtraContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
`

export default function MediaCard({ type, className, name, value, extraTail, titleExtra }: MediaCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const { downloadUrl } = useBucketContext()
  const { t } = useTranslation()

  const content = useMemo(() => {
    if (type === 'image') {
      return <StyledImage src={value} alt={value} />
    }

    if (type === 'video') {
      return (
        <StyledVideo src={value} controls />
      )
    }

    if (type === 'audio') {
      return (
        <StyledAudio src={value} controls />
      )
    }

    if (type === 'pdf') {
      return (
        <StyledIframe src={value} title="pdf" />
      )
    }

    if (type === 'mobi') {
      return (
        <StyledIframe src={value} title="mobi" />
      )
    }

    if (type === 'epub') {
      return (
        <StyledIframe src={value} title="epub" />
      )
    }

    if (type === 'zip') {
      return (
        <PrimaryButton icon={<DownloadOutlined type="text" />} onClick={() => download(downloadUrl, value)}>
          {t('renderer.downloadZipFile')}
        </PrimaryButton>
      )
    }
  }, [type, value, downloadUrl, t])

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
        <ExtraContainer>
          <FullScreenButton elementRef={ref as React.RefObject<HTMLElement>} />
          {extraTail}
        </ExtraContainer>
      )}
    >
      {content}
    </RenderCard>
  )
}
