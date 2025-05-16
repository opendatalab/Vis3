import type { BlockInfo } from '@visu/kit'
import { ROOT_BLOCK_ID, RenderBlock, getBasename, getPathType } from '@visu/kit'
import clsx from 'clsx'
import { useCallback, useEffect, useRef, useState } from 'react'
import { gid } from '../../utils'
export interface BlockPreviewerProps {
  className?: string
  path: string
}

export default function BlockPreviewer({ className, path }: BlockPreviewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const basename = getBasename(path)
  const pathType = getPathType(basename) || 'txt'
  const [blocks, setBlocks] = useState<BlockInfo[]>([{
    id: ROOT_BLOCK_ID,
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
  }, [])

  const handleBlockClose = useCallback((id: string) => {
    setBlocks(pre => pre.filter(block => block.id !== id))
  }, [])

  // s3://llm-users-phdd2/jinzhenj2/demo_data_output/part-675bf9ba2e22-000000.jsonl

  return (
    <div ref={containerRef} className={clsx(className, 'block-previewer', 'flex', 'items-start', 'gap-4', 'overflow-x-auto', 'h-full')}>
      {
        blocks.map(block => {
          return (
            <RenderBlock
              key={block.id}
              block={block}
              updateBlock={updateBlock}
              onClose={() => handleBlockClose(block.id)}
              style={{ width: `calc(100% / ${blocks.length})` }}
            />
          )
        })
      }
    </div>
  )
}
