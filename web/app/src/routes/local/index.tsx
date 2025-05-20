import type { QueryOptions } from '@tanstack/react-query'
import type { BucketParams } from '@visu/kit'
import type { UploadProps } from 'antd'
import SiderArrowLeft from '@/assets/sider-arrow-left.svg?react'
import SiderArrowRight from '@/assets/sider-arrow-right.svg?react'
import UploadIcon from '@/assets/upload.svg?react'
import { ClearOutlined, CloseOutlined, UploadOutlined } from '@ant-design/icons'
import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from '@visu/i18n'
import { BucketContext, getBytes, getPathType, RenderBlock, ROOT_BLOCK_ID } from '@visu/kit'

import { Button, List, message, Tooltip, Upload } from 'antd'
import clsx from 'clsx'
import { useCallback, useEffect, useMemo, useState } from 'react'

import styles from './index.module.css'

export const Route = createFileRoute('/local/')({
  component: RouteComponent,
})

interface WarcRecord {
  warcType: string
  warcRecordId: string
  date: string
  content: string
  url?: string
  contentType?: string
}

interface FileItem {
  id?: number // 用于IndexedDB
  name: string
  content: string
  type: string
  lastModified: number
  warcRecords?: WarcRecord[] // WARC记录
  isCompressed?: boolean // 是否为压缩文件
  decompressedContent?: string // 解压后的内容
}

// IndexedDB操作函数
const dbName = 'filesDB'
const storeName = 'files'

// 打开数据库连接
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, 1)

    request.onerror = () => reject(request.error)

    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName, { keyPath: 'id', autoIncrement: true })
      }
    }
  })
}

// 保存文件到IndexedDB
async function saveFile(file: FileItem): Promise<number> {
  const db = await openDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite')
    const store = transaction.objectStore(storeName)
    const request = store.add(file)

    request.onsuccess = () => resolve(request.result as number)
    request.onerror = () => reject(request.error)

    transaction.oncomplete = () => db.close()
  })
}

async function deleteAllFiles(): Promise<void> {
  const db = await openDB()
  const transaction = db.transaction(storeName, 'readwrite')
  const store = transaction.objectStore(storeName)
  const request = store.clear()

  request.onsuccess = () => Promise.resolve()
  request.onerror = () => Promise.reject(request.error)

  transaction.oncomplete = () => db.close()
}

// 从IndexedDB获取所有文件
async function getAllFiles(): Promise<FileItem[]> {
  const db = await openDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly')
    const store = transaction.objectStore(storeName)
    const request = store.getAll()

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)

    transaction.oncomplete = () => db.close()
  })
}

// 从IndexedDB删除文件
async function deleteFile(id: number): Promise<void> {
  const db = await openDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite')
    const store = transaction.objectStore(storeName)
    const request = store.delete(id)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)

    transaction.oncomplete = () => db.close()
  })
}

// 使用原生DecompressionStream API解压GZ文件
async function decompressGzip(buffer: ArrayBuffer): Promise<string> {
  try {
    // 检查DecompressionStream API是否可用
    if (typeof DecompressionStream === 'undefined') {
      throw new TypeError('DecompressionStream API不可用')
    }

    // 创建包含压缩数据的响应对象
    const blob = new Blob([buffer])
    const ds = new DecompressionStream('gzip')
    const decompressedStream = blob.stream().pipeThrough(ds)
    const decompressedBlob = await new Response(decompressedStream).blob()

    // 将解压后的Blob转换为文本
    return await decompressedBlob.text()
  }
  catch (error) {
    console.error('解压GZ文件失败:', error)
    throw error
  }
}

// 简单WARC解析器（不依赖外部库）
function parseWARCContent(content: string): WarcRecord[] {
  const records: WarcRecord[] = []

  // 使用WARC记录分隔符拆分内容
  const recordSeparator = 'WARC/1.0'
  const recordBlocks = content.split(recordSeparator).filter(block => block.trim().length > 0)

  recordBlocks.forEach((block, index) => {
    const fullBlock = recordSeparator + block

    // 解析WARC头部
    const headerEnd = fullBlock.indexOf('\r\n\r\n')
    if (headerEnd === -1) { return }

    const header = fullBlock.substring(0, headerEnd)
    const body = fullBlock.substring(headerEnd + 4)

    // 解析WARC类型
    const typeMatch = header.match(/WARC-Type:\s*([^\r\n]+)/i)
    const warcType = typeMatch ? typeMatch[1].trim() : 'unknown'

    // 解析WARC记录ID
    const recordIdMatch = header.match(/WARC-Record-ID:\s*([^\r\n]+)/i)
    const warcRecordId = recordIdMatch ? recordIdMatch[1].trim() : `record-${index}`

    // 解析日期
    const dateMatch = header.match(/WARC-Date:\s*([^\r\n]+)/i)
    const date = dateMatch ? dateMatch[1].trim() : ''

    // 解析URL
    const urlMatch = header.match(/WARC-Target-URI:\s*([^\r\n]+)/i)
    const url = urlMatch ? urlMatch[1].trim() : ''

    // 解析内容类型
    const contentTypeMatch = header.match(/Content-Type:\s*([^\r\n]+)/i)
    const contentType = contentTypeMatch ? contentTypeMatch[1].trim() : ''

    // 创建记录
    records.push({
      warcType,
      warcRecordId,
      date,
      content: body,
      url,
      contentType,
    })
  })

  return records
}

// 文件大小限制 (500MB)
const MAX_FILE_SIZE = 800 * 1024 * 1024

function RouteComponent() {
  const { t } = useTranslation()
  const [fileList, setFileList] = useState<FileItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null)
  const [fakePath, setFakePath] = useState<string>('')
  const [currentSectionNumber, setCurrentSectionNumber] = useState<number>(0)
  const [siderCollapsed, setSiderCollapsed] = useState<boolean>(false)

  useEffect(() => {
    if (selectedFile) {
      setFakePath(`http://localhost:3000/local/${selectedFile.name}`)
    }
  }, [selectedFile])

  // 组件加载时从IndexedDB加载文件
  useEffect(() => {
    const loadFiles = async () => {
      try {
        const files = await getAllFiles()
        setFileList(files)
      }
      catch (error) {
        console.error('Failed to load files:', error)
        message.error(t('load.error'))
      }
      finally {
        setLoading(false)
      }
    }

    loadFiles()
  }, [t])

  const readFile = (file: File) => {
    const reader = new FileReader()

    reader.onload = async (e) => {
      const result = e.target?.result
      let content = ''
      let isCompressed = false
      let decompressedContent = ''

      try {
        // 处理GZ压缩文件
        if (file.name.endsWith('.gz') || file.name.endsWith('.warc.gz')) {
          isCompressed = true

          if (result instanceof ArrayBuffer) {
            try {
              decompressedContent = await decompressGzip(result)
              content = decompressedContent
            }
            catch (error) {
              console.error('解压文件失败:', error)
              message.error('解压文件失败')

              // 如果解压失败，以二进制形式显示
              const uint8Array = new Uint8Array(result)
              content = Array.from(uint8Array).map(b => b.toString(16).padStart(2, '0')).join(' ')
            }
          }
        }
        else if (typeof result === 'string') {
          content = result
        }
        else if (result instanceof ArrayBuffer) {
          // 尝试将二进制数据转换为文本
          try {
            const decoder = new TextDecoder('utf-8')
            content = decoder.decode(result)
          }
          catch (error) {
            // 如果转换失败，以十六进制显示
            const uint8Array = new Uint8Array(result)
            content = Array.from(uint8Array).map(b => b.toString(16).padStart(2, '0')).join(' ')
          }
        }

        const fileItem: FileItem = {
          name: file.name,
          content,
          type: file.type,
          lastModified: file.lastModified,
          isCompressed,
          decompressedContent,
        }

        // 处理WARC文件
        if (file.name.endsWith('.warc') || file.name.endsWith('.warc.gz')) {
          try {
            // 使用我们的简单WARC解析器解析内容
            const warcContent = isCompressed ? decompressedContent : content
            const warcRecords = parseWARCContent(warcContent)

            fileItem.warcRecords = warcRecords
            fileItem.content = JSON.stringify(warcRecords, null, 2)
          }
          catch (error) {
            console.error('解析WARC文件失败:', error)
            message.error('解析WARC文件失败')
          }
        }

        // 保存到IndexedDB
        const id = await saveFile(fileItem)

        // 更新状态
        setFileList(prev => [...prev, { ...fileItem, id }])
        setSelectedFile({ ...fileItem, id })
        message.success(`${file.name} ${t('upload.success')}`)
      }
      catch (error) {
        console.error('处理文件失败:', error)
        message.error(t('save.error'))
      }
    }

    reader.onerror = () => {
      message.error(t('upload.error'))
    }

    // 判断文件类型并读取
    if (file.type.includes('text')
      || file.type.includes('json')
      || file.type.includes('jsonl')
      || file.name.endsWith('.md')
      || file.name.endsWith('.csv')
      || file.name.endsWith('.json')
      || file.name.endsWith('.jsonl')
      || file.name.endsWith('.md')
      || file.name.endsWith('.csv')
      || file.name.endsWith('.json')
      || file.name.endsWith('.jsonl')
    ) {
      reader.readAsText(file)
    }
    else if (file.type.includes('image')) {
      reader.readAsDataURL(file)
    }
    else {
      // 压缩文件、二进制文件、WARC文件等存储为ArrayBuffer
      reader.readAsArrayBuffer(file)
    }
  }

  const handleDelete = async (id?: number) => {
    if (id === undefined) { return }

    try {
      await deleteFile(id)
      // 选中删除文件的前一个文件
      setSelectedFile(null)
      setFileList(prev => prev.filter(file => file.id !== id))
      message.success(t('delete.success'))
    }
    catch (error) {
      console.error('Failed to delete file:', error)
      message.error(t('delete.error'))
    }
  }

  const handleDeleteAll = async () => {
    await deleteAllFiles()
    setFileList([])
  }

  const props: UploadProps = {
    name: 'file',
    multiple: true,
    showUploadList: false,
    beforeUpload: (file) => {
      // 检查文件大小是否超出限制
      if (file.size > MAX_FILE_SIZE) {
        message.error(`${file.name} 超过最大限制 500MB`)
        return false
      }

      // 检查是否存在同名文件
      const fileExists = fileList.some(existingFile => existingFile.name === file.name)
      if (fileExists) {
        message.error(`已存在同名文件：${file.name}`)
        return false
      }

      readFile(file)
      return false // 阻止默认上传行为
    },
    onDrop(e) {
      // 过滤文件，排除大小超过限制和同名的文件
      const filesToProcess = Array.from(e.dataTransfer.files).filter((file) => {
        // 检查文件大小
        if (file.size > MAX_FILE_SIZE) {
          message.error(`${file.name} 超过最大限制 500MB`)
          return false
        }

        // 检查是否存在同名文件
        const fileExists = fileList.some(existingFile => existingFile.name === file.name)
        if (fileExists) {
          message.error(`已存在同名文件：${file.name}`)
          return false
        }

        return true
      })

      filesToProcess.forEach(file => readFile(file))
    },
  }

  const handleParamsChange = useCallback(({ path }: BucketParams) => {
    const currentBytes = getBytes(fakePath)
    const bytes = getBytes(path!)

    if ((bytes && !currentBytes) || (bytes && currentBytes && bytes?.byte > currentBytes?.byte)) {
      setCurrentSectionNumber(prev => prev + 1)
    }
    else if ((!bytes && currentBytes) || (bytes && currentBytes && bytes?.byte < currentBytes?.byte)) {
      setCurrentSectionNumber(prev => prev - 1)
    }

    setFakePath(path!)
  }, [fakePath])

  const bucketContextValue = useMemo(() => ({
    path: fakePath,
    onParamsChange: handleParamsChange,
    bucketQueryOptions: {} as QueryOptions,
    downloadUrl: '',
    previewUrl: '',
    mimeTypeUrl: '',
  }), [fakePath, handleParamsChange])

  const dataSource = useMemo(() => {
    if (!selectedFile) { return undefined }

    let content = selectedFile.content

    if (selectedFile.name.endsWith('.jsonl') || selectedFile.name.endsWith('.jsonl.gz')) {
      // jsonl 取第一行
      content = content.split('\n')[currentSectionNumber]
    }
    else if ((selectedFile.name.endsWith('.warc') || selectedFile.name.endsWith('.warc.gz')) && selectedFile.warcRecords) {
      // WARC文件显示特定记录
      const recordIndex = Math.min(currentSectionNumber, selectedFile.warcRecords.length - 1)
      if (recordIndex >= 0 && selectedFile.warcRecords[recordIndex]) {
        const record = selectedFile.warcRecords[recordIndex]
        content = JSON.stringify({
          type: record.warcType,
          recordId: record.warcRecordId,
          date: record.date,
          url: record.url,
          contentType: record.contentType,
          content: record.content,
        }, null, 2)
      }
    }
    else if (selectedFile.name.endsWith('.gz') && !selectedFile.name.endsWith('.warc.gz') && selectedFile.decompressedContent) {
      // 普通GZ文件显示解压后的内容
      content = selectedFile.decompressedContent
    }

    const bytes = getBytes(fakePath)
    const type = getPathType(selectedFile.name) || selectedFile.type.split('/')[0] as any

    return {
      id: selectedFile.id!,
      mimetype: type,
      name: selectedFile.name,
      type,
      content,
      last_modified: selectedFile.lastModified.toString(),
      size: selectedFile.content.length,
      created_by: 'local',
      // 模拟range
      path: `http://localhost:3000/local/${selectedFile.name}?bytes=${bytes?.byte ?? 0},${content.length}`,
    }
  }, [selectedFile, currentSectionNumber, fakePath])

  const uploader = useMemo(() => (
    <div className="flex flex-col items-center justify-center w-full flex-1">
      <Upload.Dragger {...props} className={clsx(styles.uploadDragger, 'mb-8')}>
        <div className="flex flex-col items-center justify-center gap-2">
          <UploadIcon className="text-4xl" />
          <p className="text-[20px]">{t('upload.drag')}</p>
          <p className="text-sm text-gray-500">{t('upload.recommend')}</p>
        </div>
      </Upload.Dragger>
    </div>
  ), [t, props, fileList])

  console.log('datasource', dataSource)

  if (fileList.length === 0) {
    return uploader
  }

  console.log('bucketContextValue', dataSource?.type)

  return (
    <BucketContext.Provider value={bucketContextValue}>
      <div className="flex-1 flex flex-row py-4 gap-4">
        <div className={clsx('bg-white rounded-r-lg shrink-0 left-sider transition-all', {
          'w-[260px]': !siderCollapsed,
          'w-0 overflow-hidden': siderCollapsed,
        })}
        >
          <List
            loading={loading}
            size="small"
            className={clsx('w-[260px] flex flex-col', styles.fileList)}
            header={(
              <div className="flex justify-between px-4">
                <span className="font-bold">文件列表</span>
                <div className="flex flex-row items-center gap-2">
                  <Upload {...props}>
                    <Button type="text" size="small" icon={<UploadOutlined />} />
                  </Upload>
                  <Button type="text" size="small" icon={<ClearOutlined />} danger onClick={() => handleDeleteAll()} />
                </div>
              </div>
            )}
            dataSource={fileList}
            renderItem={item => (
              <List.Item
                className={clsx('flex flex-row items-center justify-between !px-4 cursor-pointer hover:bg-gray-100 transition-colors', {
                  'bg-blue-100': selectedFile?.id === item.id,
                })}
                onClick={() => setSelectedFile(item)}
              >
                <List.Item.Meta
                  title={<Tooltip placement="topLeft" title={item.name}>{item.name}</Tooltip>}
                  description={new Date(item.lastModified).toLocaleString()}
                />
                <Button type="text" size="small" key="delete" icon={<CloseOutlined />} danger onClick={() => handleDelete(item.id)} />
              </List.Item>
            )}
          />
        </div>

        {/* <div className="flex flex-col"> */}
        <div
          onClick={() => setSiderCollapsed(!siderCollapsed)}
          className="fixed left-[242px] top-1/2 transform -translate-y-1/2 z-10 text-gray-300 h-8 w-4 flex items-center justify-center rounded-r-md cursor-pointer hover:text-gray-400 transition-colors"
          style={{
            left: siderCollapsed ? '0' : '242px',
            transition: 'left 0.1s',
          }}
        >
          {siderCollapsed ? <SiderArrowRight /> : <SiderArrowLeft />}
        </div>
        {/* </div> */}

        <div
          className={clsx('flex-1 body-content transition-all', {
            'flex flex-col items-center justify-center': !selectedFile,
            'max-w-[calc(100vw-32px)]': siderCollapsed,
            'max-w-[calc(100vw-292px)]': !siderCollapsed,
          })}
          data-block-id="origin"
        >
          {
            selectedFile
              ? (
                  <RenderBlock
                    dataSource={dataSource}
                    block={{
                      id: ROOT_BLOCK_ID,
                      path: fakePath,
                      pathType: dataSource?.type,
                    }}
                    updateBlock={() => {}}
                  />
                )
              : uploader
          }
        </div>
      </div>
    </BucketContext.Provider>
  )
}
