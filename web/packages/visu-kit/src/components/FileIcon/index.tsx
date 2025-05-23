import styled from '@emotion/styled'

import AudioIcon from '../../assets/file-icons/audio.svg?react'
import BabelIcon from '../../assets/file-icons/babel.svg?react'
import BucketIcon from '../../assets/file-icons/bucket.svg?react'
import CssIcon from '../../assets/file-icons/css.svg?react'
import SqlIcon from '../../assets/file-icons/database.svg?react'
import DockerIcon from '../../assets/file-icons/docker.svg?react'
import EslintIcon from '../../assets/file-icons/eslint.svg?react'
import FolderIcon from '../../assets/file-icons/folder.svg?react'
import GitIcon from '../../assets/file-icons/git.svg?react'
import GoIcon from '../../assets/file-icons/go.svg?react'
import GraphqlIcon from '../../assets/file-icons/graphql.svg?react'
import HtmlIcon from '../../assets/file-icons/html.svg?react'
import ImageIcon from '../../assets/file-icons/image.svg?react'
import JavaIcon from '../../assets/file-icons/java.svg?react'
import JavaScriptIcon from '../../assets/file-icons/javascript.svg?react'
import JsonIcon from '../../assets/file-icons/json.svg?react'
import LessIcon from '../../assets/file-icons/less.svg?react'
import MarkdownIcon from '../../assets/file-icons/markdown.svg?react'
import NpmIcon from '../../assets/file-icons/npm.svg?react'
import PdfIcon from '../../assets/file-icons/pdf.svg?react'
import PhpIcon from '../../assets/file-icons/php.svg?react'
import PrettierIcon from '../../assets/file-icons/prettier.svg?react'
import PythonIcon from '../../assets/file-icons/python.svg?react'
import ReactIcon from '../../assets/file-icons/react.svg?react'
import RustIcon from '../../assets/file-icons/rust.svg?react'
import SassIcon from '../../assets/file-icons/sass.svg?react'
import TableIcon from '../../assets/file-icons/table.svg?react'
import TextIcon from '../../assets/file-icons/text.svg?react'
import TomlIcon from '../../assets/file-icons/toml.svg?react'
import TsConfigIcon from '../../assets/file-icons/tsconfig.svg?react'
import TypeScriptIcon from '../../assets/file-icons/typescript.svg?react'
import VideoIcon from '../../assets/file-icons/video.svg?react'
import ViteIcon from '../../assets/file-icons/vite.svg?react'
import VueIcon from '../../assets/file-icons/vue.svg?react'
import WebpackIcon from '../../assets/file-icons/webpack.svg?react'
import DocumentIcon from '../../assets/file-icons/word.svg?react'
import XMLIcon from '../../assets/file-icons/xml.svg?react'
import YamlIcon from '../../assets/file-icons/yaml.svg?react'
import ZipIcon from '../../assets/file-icons/zip.svg?react'

const IconWrapper = styled.div`
  font-size: 16px;
`

export const fileTypeIconMapping = {
  // 基础文件类型
  folder: <FolderIcon />,
  file: <TextIcon />,
  bucket: <BucketIcon />,
  
  // 文本和文档
  txt: <TextIcon />,
  md: <MarkdownIcon />,
  markdown: <MarkdownIcon />,
  pdf: <PdfIcon />,
  doc: <DocumentIcon />,
  docx: <DocumentIcon />,
  rtf: <DocumentIcon />,
  
  // 数据和配置文件
  json: <JsonIcon />,
  jsonl: <JsonIcon />,
  yaml: <YamlIcon />,
  yml: <YamlIcon />,
  toml: <TomlIcon />,
  xml: <XMLIcon />,
  csv: <TableIcon />,
  xls: <TableIcon />,
  xlsx: <TableIcon />,
  sql: <SqlIcon />,
  sqlite: <SqlIcon />,
  graphql: <GraphqlIcon />,
  gql: <GraphqlIcon />,
  
  // Web 开发
  ts: <TypeScriptIcon />,
  tsx: <ReactIcon />,
  js: <JavaScriptIcon />,
  jsx: <ReactIcon />,
  vue: <VueIcon />,
  // svelte: <SvelteIcon />,
  html: <HtmlIcon />,
  htm: <HtmlIcon />,
  css: <CssIcon />,
  less: <LessIcon />,
  sass: <SassIcon />,
  scss: <SassIcon />,
  
  // 后端开发
  py: <PythonIcon />,
  pyc: <PythonIcon />,
  java: <JavaIcon />,
  class: <JavaIcon />,
  jar: <JavaIcon />,
  go: <GoIcon />,
  rs: <RustIcon />,
  php: <PhpIcon />,
  sh: <TextIcon />,
  bash: <TextIcon />,
  zsh: <TextIcon />,
  fish: <TextIcon />,
  
  // 配置文件
  'tsconfig.json': <TsConfigIcon />,
  'package.json': <NpmIcon />,
  'package-lock.json': <NpmIcon />,
  'yarn.lock': <NpmIcon />,
  'pnpm-lock.yaml': <NpmIcon />,
  '.gitignore': <GitIcon />,
  '.eslintrc': <EslintIcon />,
  '.eslintrc.js': <EslintIcon />,
  '.eslintrc.json': <EslintIcon />,
  '.prettierrc': <PrettierIcon />,
  '.prettierrc.js': <PrettierIcon />,
  '.babelrc': <BabelIcon />,
  'babel.config.js': <BabelIcon />,
  'vite.config.ts': <ViteIcon />,
  'vite.config.js': <ViteIcon />,
  'webpack.config.js': <WebpackIcon />,
  'Dockerfile': <DockerIcon />,
  'docker-compose.yml': <DockerIcon />,
  'docker-compose.yaml': <DockerIcon />,
  
  // 媒体文件
  mp3: <AudioIcon />,
  wav: <AudioIcon />,
  ogg: <AudioIcon />,
  mp4: <VideoIcon />,
  avi: <VideoIcon />,
  mov: <VideoIcon />,
  mkv: <VideoIcon />,
  webm: <VideoIcon />,
  jpg: <ImageIcon />,
  jpeg: <ImageIcon />,
  png: <ImageIcon />,
  gif: <ImageIcon />,
  svg: <ImageIcon />,
  webp: <ImageIcon />,
  ico: <ImageIcon />,
  
  // 压缩文件
  zip: <ZipIcon />,
  rar: <ZipIcon />,
  '7z': <ZipIcon />,
  tar: <ZipIcon />,
  gz: <ZipIcon />,
  tgz: <ZipIcon />,
} as const

export interface FileIconProps {
  path?: string
  type?: keyof typeof fileTypeIconMapping
}

export function FileIcon({ path, type }: FileIconProps) {
  const getFileType = (filePath: string): keyof typeof fileTypeIconMapping | undefined => {
    // 处理文件夹
    if (!filePath.includes('.') && filePath.endsWith('/')) {
      return 'folder'
    }

    if (filePath.endsWith('.jsonl.gz')) {
      return 'jsonl'
    }

    // 检查特定的配置文件
    const fileName = filePath.split('/').pop()?.toLowerCase()
    if (fileName && fileTypeIconMapping.hasOwnProperty(fileName)) {
      return fileName as keyof typeof fileTypeIconMapping
    }

    // 获取文件扩展名
    const extension = filePath.split('.').pop()?.toLowerCase()
    if (extension && extension in fileTypeIconMapping) {
      return extension as keyof typeof fileTypeIconMapping
    }

    return 'file'
  }

  if (type) {
    return fileTypeIconMapping[type]
  }

  if (path) {
    const pathWithoutQuery = path.split('?')[0]
    const fileType = getFileType(pathWithoutQuery)

    return fileType ? fileTypeIconMapping[fileType] : fileTypeIconMapping.file
  }

  return fileTypeIconMapping.file
}