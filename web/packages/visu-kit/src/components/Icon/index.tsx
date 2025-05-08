import Icon from '@ant-design/icons'

import AudioIconSvg from '../../assets/file-icons/audio.svg?react'
import BucketIconSvg from '../../assets/file-icons/bucket.svg?react'
import DocumentSvg from '../../assets/file-icons/doc.svg?react'
import FolderIconSvg from '../../assets/file-icons/folder.svg?react'
import HtmlIconSvg from '../../assets/file-icons/html.svg?react'
import ImageIconSvg from '../../assets/file-icons/image.svg?react'
import JsonIconSvg from '../../assets/file-icons/json.svg?react'
import MarkdownIconSvg from '../../assets/file-icons/markdown.svg?react'
import ParentIconSvg from '../../assets/file-icons/parent.svg?react'
import PdfIconSvg from '../../assets/file-icons/pdf.svg?react'
import PythonIconSvg from '../../assets/file-icons/python.svg?react'
import TableIconSvg from '../../assets/file-icons/table.svg?react'
import TxtIconSvg from '../../assets/file-icons/text.svg?react'
import VideoIconSvg from '../../assets/file-icons/video.svg?react'
import ZipIconSvg from '../../assets/file-icons/zip.svg?react'

function IconWrapper(props: React.ComponentProps<typeof Icon>) {
  return <Icon {...props} />
}

export function CsvIcon(props: React.ComponentProps<typeof Icon>) {
  return <IconWrapper {...props} component={TableIconSvg} />
}

export function DocIcon(props: React.ComponentProps<typeof Icon>) {
  return <IconWrapper {...props} component={DocumentSvg} />
}

export function JsonIcon(props: React.ComponentProps<typeof Icon>) {
  return <IconWrapper {...props} component={JsonIconSvg} />
}

export function TxtIcon(props: React.ComponentProps<typeof Icon>) {
  return <IconWrapper {...props} component={TxtIconSvg} />
}

export function ImageIcon(props: React.ComponentProps<typeof Icon>) {
  return <IconWrapper {...props} component={ImageIconSvg} />
}

export function VideoIcon(props: React.ComponentProps<typeof Icon>) {
  return <IconWrapper {...props} component={VideoIconSvg} />
}

export function AudioIcon(props: React.ComponentProps<typeof Icon>) {
  return <IconWrapper {...props} component={AudioIconSvg} />
}

export function BucketIcon(props: React.ComponentProps<typeof Icon>) {
  return <IconWrapper {...props} component={BucketIconSvg} />
}

export function FolderIcon(props: React.ComponentProps<typeof Icon>) {
  return <IconWrapper {...props} component={FolderIconSvg} />
}

export function MarkdownIcon(props: React.ComponentProps<typeof Icon>) {
  return <IconWrapper {...props} component={MarkdownIconSvg} />
}

export function ParentIcon(props: React.ComponentProps<typeof Icon>) {
  return <IconWrapper {...props} component={ParentIconSvg} />
}

export function PdfIcon(props: React.ComponentProps<typeof Icon>) {
  return <IconWrapper {...props} component={PdfIconSvg} />
}

export function ZipIcon(props: React.ComponentProps<typeof Icon>) {
  return <IconWrapper {...props} component={ZipIconSvg} />
}

export function HtmlIcon(props: React.ComponentProps<typeof Icon>) {
  return <IconWrapper {...props} component={HtmlIconSvg} />
}

export function PythonIcon(props: React.ComponentProps<typeof Icon>) {
  return <IconWrapper {...props} component={PythonIconSvg} />
}
