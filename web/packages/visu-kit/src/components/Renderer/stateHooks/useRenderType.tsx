import { DownOutlined } from '@ant-design/icons'
import { Divider, Dropdown, type MenuProps } from 'antd'
import { useMemo, useState } from 'react'

export type RenderType = 'raw' | 'image' | 'html' | 'json' | 'markdown' | 'content_list' | 'img_list'

const renderOptions = [
  {
    key: 'raw',
    label: '原始内容',
    value: 'raw',
  },
  {
    key: 'image',
    label: '图片',
    value: 'image',
  },
  {
    key: 'html',
    label: '网页',
    value: 'html',
  },
  {
    key: 'json',
    label: 'JSON',
    value: 'json',
  },
  {
    key: 'markdown',
    label: 'Markdown',
    value: 'markdown',
  },
  {
    type: 'divider',
  },
  // build_in_fields
  {
    key: 'content_list',
    label: '内容列表',
    value: 'content_list',
  },
  {
    key: 'img_list',
    label: '图片列表',
    value: 'img_list',
  },
]

export default function useRenderType(initialRenderType: RenderType = 'raw'): [React.ReactNode, { renderType: RenderType | undefined }] {
  const [renderType, setRenderType] = useState<RenderType | undefined>(initialRenderType)

  const dropdownMenu: MenuProps = useMemo(() => ({
    items: renderOptions as MenuProps['items'],
    onClick: ({ key }) => {
      setRenderType(key as RenderType)
    },
    selectedKeys: [renderType ?? 'raw'],
  }), [renderType])

  const node = useMemo(() => {
    return (
      <>
        <Divider type="vertical" />
        <Dropdown menu={dropdownMenu}>
          <div className="flex items-center gap-1 font-normal cursor-pointer">
            {renderOptions.find(item => item.value === renderType)?.label}
            <DownOutlined />
          </div>
        </Dropdown>
      </>
    )
  }, [dropdownMenu, renderType])

  const state = useMemo(() => ({
    renderType,
  }), [renderType])

  return [node, state]
}
