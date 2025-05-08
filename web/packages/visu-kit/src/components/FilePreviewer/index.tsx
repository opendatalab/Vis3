import { message } from 'antd'
import { useCallback, useEffect, useRef, useState } from 'react'

import { BucketItem } from '../../types'
import { gid } from '../../utils'
import { useBucketContext } from '../BucketPreviewer/context'
import type { BlockInfo } from '../Renderer/Block'
import { RenderBlock } from '../Renderer/Block'
import { getBasename, getPathType } from '../Renderer/utils'

export interface FilePreviewerProps {
  data: BucketItem
}

export default function FilePreviewer() {
  const { path = '', pageSize, pageNo } = useBucketContext()
  const containerRef = useRef<HTMLDivElement>(null)
  const [messageApi, contextHolder] = message.useMessage()
  const basename = getBasename(path)
  const pathType = getPathType(basename) || 'txt'
  const [blocks, setBlocks] = useState<BlockInfo[]>([{
    id: 'origin',
    path,
    pathType,
  }])

  const updateBlock = useCallback((id: string, values: Partial<BlockInfo>) => {
    // 更新block
    setBlocks((pre) => {
      return pre.map((_block) => {
        if (_block.id === id) {
          return {
            ..._block,
            ...values,
          }
        }

        return _block
      })
    })
  }, [])

  useEffect(() => {
    // 更新第一个block
    setBlocks(pre => ([
      {
        ...pre[0],
        path,
        pathType,
      },
    ]))
  }, [path, pathType])

  useEffect(() => {
    const handleS3PathClick = async (e: any) => {
      const inputPath = e.detail.path

      try {
        setBlocks(pre => ([
          ...pre.slice(0, 1),
          ...pre.slice(1),
          {
            id: gid(),
            path: inputPath,
            pathType: getPathType(inputPath),
          } as BlockInfo,
        ]))

        setTimeout(() => {
          // 滚动到最右侧
          if (containerRef.current) {
            containerRef.current.scrollTo({
              left: containerRef.current.scrollWidth,
              behavior: 'smooth',
            })
          }
        })
      }
      catch (e) {
        console.error('error', e)
      }
    }
    // 监听s3-path-click事件
    document.addEventListener('s3-path-click', handleS3PathClick)

    return () => {
      document.removeEventListener('s3-path-click', handleS3PathClick)
    }
  }, [messageApi])

  const handleBlockClose = useCallback((id: string) => {
    setBlocks(pre => pre.filter(block => block.id !== id))
  }, [])

  // s3://llm-users-phdd2/jinzhenj2/demo_data_output/part-675bf9ba2e22-000000.jsonl

  return (
    <div className="flex items-start gap-2 overflow-x-auto h-full" ref={containerRef}>
      {contextHolder}
      {
        blocks.map(block => {
          return (
            <div className="h-full relative" data-block-id={block.id} key={block.id} style={{ minWidth: `calc(100%/5)`, width: `calc(100%/${blocks.length})` }}>
              <RenderBlock
                block={block}
                updateBlock={updateBlock}
                onClose={() => handleBlockClose(block.id)}
                initialParams={block.id === 'origin' ? { pageSize, pageNo } : undefined}
              />
            </div>
          )
        })
      }
    </div>
  )
}
