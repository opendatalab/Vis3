import { DownOutlined } from '@ant-design/icons'
import styled from '@emotion/styled'
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

const StyledRenderTrigger = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  
`

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
          <StyledRenderTrigger>
            {renderOptions.find(item => item.value === renderType)?.label}
            <DownOutlined />
          </StyledRenderTrigger>
        </Dropdown>
      </>
    )
  }, [dropdownMenu, renderType])

  const state = useMemo(() => ({
    renderType,
  }), [renderType])

  return [node, state]
}
